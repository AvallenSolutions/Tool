/**
 * Geocoding Service
 * Converts addresses to latitude/longitude coordinates using Nominatim API
 */

interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

interface NominatimResponse {
  lat: string;
  lon: string;
  display_name: string;
}

export class GeocodingService {
  private readonly baseUrl = 'https://nominatim.openstreetmap.org';
  
  /**
   * Geocode an address to get coordinates
   */
  async geocodeAddress(
    street?: string,
    city?: string,
    postalCode?: string,
    country?: string
  ): Promise<GeocodeResult | null> {
    try {
      // Build address components
      const addressParts = [street, city, postalCode, country].filter(Boolean);
      
      if (addressParts.length === 0) {
        console.warn('No address components provided for geocoding');
        return null;
      }
      
      const addressQuery = addressParts.join(', ');
      
      // Call Nominatim API
      const url = `${this.baseUrl}/search?` + new URLSearchParams({
        q: addressQuery,
        format: 'json',
        limit: '1',
        addressdetails: '1'
      });
      
      console.log(`🌍 Geocoding address: ${addressQuery}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Sustainability-Platform/1.0 (contact@avallen.solutions)'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`);
      }
      
      const data: NominatimResponse[] = await response.json();
      
      if (!data || data.length === 0) {
        console.warn(`No geocoding results found for: ${addressQuery}`);
        return null;
      }
      
      const result = data[0];
      const latitude = parseFloat(result.lat);
      const longitude = parseFloat(result.lon);
      
      if (isNaN(latitude) || isNaN(longitude)) {
        throw new Error('Invalid coordinates returned from geocoding service');
      }
      
      console.log(`✅ Geocoded "${addressQuery}" -> ${latitude}, ${longitude}`);
      
      return {
        latitude,
        longitude,
        formattedAddress: result.display_name
      };
      
    } catch (error) {
      console.error('❌ Geocoding error:', error);
      
      // Log the specific error for debugging but don't throw
      // This allows the supplier to still be created without coordinates
      return null;
    }
  }
  
  /**
   * Calculate distance between two points using Haversine formula
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c; // Distance in kilometers
  }
  
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

// Export singleton instance
export const geocodingService = new GeocodingService();