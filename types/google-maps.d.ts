// Google Maps JavaScript API type declarations
declare global {
  interface Window {
    google: {
      maps: {
        Geocoder: new () => {
          geocode: (
            request: { placeId: string },
            callback?: (
              results: Array<{
                geometry: {
                  location: {
                    lat: () => number;
                    lng: () => number;
                  };
                };
              }>,
              status: string
            ) => void
          ) => Promise<{
            results: Array<{
              geometry: {
                location: {
                  lat: () => number;
                  lng: () => number;
                };
              };
            }>;
          }>;
        };
      };
    };
  }
}

export {};
