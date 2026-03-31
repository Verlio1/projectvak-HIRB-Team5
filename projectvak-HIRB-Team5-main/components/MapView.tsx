import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Property } from '../types';
import { Building2, Euro, BedDouble, MapPin } from 'lucide-react';

// Fix Leaflet default icon issue with webpack/vite bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Theme blue marker color
const MARKER_COLOR = '#2563eb';

const createColoredIcon = (color: string) =>
    L.divIcon({
        html: `
      <div style="
        width: 32px;
        height: 32px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      "></div>
    `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -36],
        className: '',
    });

interface MapViewProps {
    properties: Property[];
}

export const MapView: React.FC<MapViewProps> = ({ properties }) => {
    const mappedProperties = properties.filter(
        (p) => p.latitude != null && p.longitude != null
    );
    const unmappedCount = properties.length - mappedProperties.length;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Kaart</h2>
                <span className="text-sm text-gray-500">
                    {mappedProperties.length} van {properties.length} panden zichtbaar
                </span>
            </div>

            {unmappedCount > 0 && (
                <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                    <MapPin size={16} className="flex-shrink-0" />
                    <span>
                        <strong>{unmappedCount} pand{unmappedCount > 1 ? 'en' : ''}</strong> zonder geldig adres{unmappedCount > 1 ? ' zijn' : ' is'} niet zichtbaar op de kaart.
                        Bewerk het pand en sla het opnieuw op om het te geocoderen.
                    </span>
                </div>
            )}

            <div
                className="rounded-xl overflow-hidden border border-gray-200 shadow-sm"
                style={{ height: 'calc(100vh - 220px)', minHeight: '480px' }}
            >
                <MapContainer
                    center={[50.85, 4.35]}
                    zoom={8}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {mappedProperties.map((prop) => (
                        <Marker
                            key={prop.pand_id}
                            position={[prop.latitude!, prop.longitude!]}
                            icon={createColoredIcon(MARKER_COLOR)}
                        >
                            <Popup maxWidth={280}>
                                <div className="p-1">
                                    {/* Header */}
                                    <div className="flex items-start gap-2 mb-3">
                                        <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                            style={{ background: MARKER_COLOR }}
                                        >
                                            <Building2 size={16} color="white" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-sm leading-tight">{prop.pand_naam}</h3>
                                            <span
                                                className="text-xs px-1.5 py-0.5 rounded font-medium text-white"
                                                style={{ background: MARKER_COLOR }}
                                            >
                                                {prop.stijl}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Address */}
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                                        <MapPin size={12} />
                                        <span>{prop.straat}, {prop.postcode} {prop.plaats}</span>
                                    </div>

                                    {/* Stats */}
                                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                        <div className="flex items-center gap-1 text-sm font-bold text-indigo-700">
                                            <Euro size={14} />
                                            {prop.prijs.toLocaleString('nl-BE')}
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                            <BedDouble size={12} />
                                            {prop.aantal_kamers} kamer{prop.aantal_kamers !== 1 ? 's' : ''}
                                        </div>
                                    </div>

                                    {prop.laatste_notities && (
                                        <p className="text-xs text-gray-400 italic mt-2 border-t border-gray-100 pt-2 leading-snug">
                                            "{prop.laatste_notities}"
                                        </p>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>
        </div>
    );
};
