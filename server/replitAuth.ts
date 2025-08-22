import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // CAPTCHA verification endpoint (rate limiting will be added later)
  app.post("/api/verify-captcha", async (req, res) => {
    try {
      const { captchaToken } = req.body;
      
      if (!captchaToken) {
        return res.status(400).json({ success: false, message: "CAPTCHA token is required" });
      }

      // Verify CAPTCHA with Google
      const secretKey = process.env.RECAPTCHA_SECRET_KEY || "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe"; // Test key for development
      const verificationUrl = `https://www.google.com/recaptcha/api/siteverify`;
      
      const verificationResponse = await fetch(verificationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `secret=${secretKey}&response=${captchaToken}`,
      });

      const verificationData = await verificationResponse.json();

      if (verificationData.success) {
        // Store CAPTCHA verification in session
        (req.session as any).captchaVerified = true;
        (req.session as any).captchaVerifiedAt = Date.now();
        
        res.json({ success: true, message: "CAPTCHA verified successfully" });
      } else {
        console.log('CAPTCHA verification failed:', verificationData);
        res.status(400).json({ 
          success: false, 
          message: "CAPTCHA verification failed",
          errors: verificationData['error-codes'] || []
        });
      }
    } catch (error) {
      console.error('CAPTCHA verification error:', error);
      res.status(500).json({ success: false, message: "Server error during CAPTCHA verification" });
    }
  });

  app.get("/api/login", (req, res, next) => {
    // Check if CAPTCHA was verified in the last 5 minutes
    const session = req.session as any;
    const captchaVerified = session?.captchaVerified;
    const captchaVerifiedAt = session?.captchaVerifiedAt;
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);

    if (!captchaVerified || !captchaVerifiedAt || captchaVerifiedAt < fiveMinutesAgo) {
      console.log('CAPTCHA verification required or expired');
      return res.redirect('/login?error=captcha_required');
    }

    // Clear CAPTCHA verification after use
    delete session.captchaVerified;
    delete session.captchaVerifiedAt;

    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/app/welcome",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;
  
  console.log('isAuthenticated middleware check for:', req.url, {
    isAuthenticated: req.isAuthenticated(),
    hasUser: !!user,
    hasExpiresAt: !!user?.expires_at,
    userObject: user ? Object.keys(user) : 'no user'
  });

  // Development mode bypass for testing
  if (process.env.NODE_ENV === 'development' && !req.isAuthenticated()) {
    console.log('Development mode: Creating mock user for testing');
    
    try {
      // Use Tim's admin account
      try {
        await storage.upsertUser({
          id: 'admin-tim',
          email: 'tim@avallen.solutions',
          firstName: 'Tim',
          lastName: 'Admin',
          role: 'admin'
        });
      } catch (error) {
        // User already exists, that's fine
        console.log('User already exists, continuing...');
      }
      
      // Get existing company with products (use company 1 which has data)
      try {
        let company = await storage.getCompanyByOwner('admin-tim');
        if (!company) {
          // If no company exists for admin-tim, get demo company
          const demoCompany = await storage.getCompanyById(1);
          if (demoCompany) {
            console.log('Using existing demo company with products:', demoCompany.name, 'ID:', demoCompany.id);
          }
        } else {
          console.log('Using admin company with products:', company.name, 'ID:', company.id);
        }
      } catch (error) {
        console.log('Error getting company:', error);
      }
    } catch (error: unknown) {
      console.error('Error creating mock user/company:', error);
    }
    
    (req as any).user = {
      claims: { 
        sub: 'admin-tim',
        email: 'tim@avallen.solutions',
        first_name: 'Tim',
        last_name: 'Admin'
      },
      expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      access_token: 'dev-token',
      refresh_token: 'dev-refresh'
    };
    return next();
  }

  if (!req.isAuthenticated() || !user?.expires_at) {
    console.log('Authentication failed - missing auth or expires_at');
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
