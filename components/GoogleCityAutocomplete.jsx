import { useEffect, useRef, useState } from 'react';

// Shared script loading promise to prevent multiple injections
let googleMapsScriptPromise = null;

function loadGoogleMapsScript(apiKey, libraries = ['places']) {
    if (typeof window === 'undefined') return Promise.reject("Server side");
    if (window.google && window.google.maps) {
        return Promise.resolve(window.google.maps);
    }

    // Check if script is already in DOM but not loaded (e.g. from RouteMapModal)
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
        if (window.google && window.google.maps) return Promise.resolve(window.google.maps);
        // If script exists but google not ready, wait for it
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (window.google && window.google.maps) {
                    clearInterval(checkInterval);
                    resolve(window.google.maps);
                }
            }, 100);
            // Timeout after 10s
            setTimeout(() => {
                clearInterval(checkInterval);
                if (window.google && window.google.maps) resolve(window.google.maps);
            }, 10000);
        });
    }

    if (!googleMapsScriptPromise) {
        googleMapsScriptPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${libraries.join(',')}&loading=async&callback=initGoogleMapsCallback`;
            script.async = true;
            script.defer = true;
            script.id = 'google-maps-script'; // Tag for easy finding
            script.onerror = reject;

            window.initGoogleMapsCallback = () => {
                resolve(window.google.maps);
            };

            document.head.appendChild(script);
        });
    }

    return googleMapsScriptPromise;
}

export default function GoogleCityAutocomplete({ label, value, onChange, onPick, placeholder = "City, ST", className = "", inputClassName = "" }) {
    const inputRef = useRef(null);
    const autocompleteRef = useRef(null);
    const [scriptLoaded, setScriptLoaded] = useState(false);

    useEffect(() => {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            console.warn('Google Maps API Key missing');
            return;
        }

        loadGoogleMapsScript(apiKey)
            .then(() => setScriptLoaded(true))
            .catch(err => console.error('Failed to load Google Maps script', err));
    }, []);

    useEffect(() => {
        if (!scriptLoaded || !inputRef.current) return;
        if (autocompleteRef.current) return; // Prevent double init

        const options = {
            types: ['(cities)'],
            componentRestrictions: { country: ['us', 'ca', 'mx'] },
            fields: ['address_components', 'geometry', 'formatted_address']
        };

        autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, options);

        autocompleteRef.current.addListener('place_changed', () => {
            const place = autocompleteRef.current.getPlace();

            if (!place.address_components) {
                // User entered text that didn't match a suggestion perfectly or hit enter early
                onChange?.(inputRef.current.value);
                return;
            }

            // Extract City, State, Zip
            let city = '';
            let state = '';
            let zip = '';
            let country = '';

            place.address_components.forEach(comp => {
                const types = comp.types;
                if (types.includes('locality')) city = comp.long_name;
                if (!city && types.includes('sublocality_level_1')) city = comp.long_name; // NYC boroughs etc
                if (!city && types.includes('sublocality')) city = comp.long_name;
                if (types.includes('administrative_area_level_1')) state = comp.short_name;
                if (types.includes('postal_code')) zip = comp.long_name;
                if (types.includes('country')) country = comp.short_name;
            });

            const formattedLabel = `${city}, ${state}`;

            // Update parent state
            onChange?.(formattedLabel);

            if (onPick) {
                onPick({
                    city,
                    state,
                    zip,
                    country,
                    // Use DB friendly keys as well closely matching existing 'it' object
                    label: formattedLabel,
                    latitude: place.geometry?.location?.lat(),
                    longitude: place.geometry?.location?.lng()
                });
            }
        });

    }, [scriptLoaded, onPick, onChange]);

    // Sync external value to input
    useEffect(() => {
        if (inputRef.current && value !== undefined && inputRef.current.value !== value) {
            inputRef.current.value = value || '';
        }
    }, [value]);

    return (
        <div className={className}>
            {label && <label className="form-label">{label}</label>}
            <input
                ref={inputRef}
                type="text"
                className={`form-input ${inputClassName}`}
                placeholder={placeholder}
                defaultValue={value}
                onChange={(e) => onChange?.(e.target.value)}
                autoComplete="off" // Disable browser autocomplete to let Google take over
                onKeyDown={(e) => {
                    if (e.key === 'Tab') {
                        // Attempt to select the first suggestion
                        const pacContainers = document.querySelectorAll('.pac-container');
                        let visibleContainer = null;
                        for (const container of pacContainers) {
                            if (container.offsetParent !== null && container.innerHTML.trim() !== '') {
                                visibleContainer = container;
                                break;
                            }
                        }

                        if (visibleContainer) {
                            const firstItem = visibleContainer.querySelector('.pac-item');
                            if (firstItem) {
                                e.preventDefault();
                                // Google Places listens for mousedown/click
                                const mouseDownEvent = new MouseEvent('mousedown', {
                                    bubbles: true,
                                    cancelable: true,
                                    view: window
                                });
                                firstItem.dispatchEvent(mouseDownEvent);
                                firstItem.click();
                                // Move focus manually after selection or let the selection handler do it? 
                                // Actually, if we preventDefault, we might stay in the input. 
                                // But usually selecting an item closes the dropdown.
                                // We might want to manually focus the next element if needed, 
                                // but for now let's just select.
                            }
                        }
                    }
                }}
            />
        </div>
    );
}
