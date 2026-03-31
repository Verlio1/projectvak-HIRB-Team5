import { Property, Client, Appointment } from './types';

// Helper for dates relative to now (2026-02-22)
const now = new Date('2026-02-22T14:00:00');
const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
const testWeek = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
const dayAfter = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

const withTime = (date: Date, hours: number, minutes: number) => {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
};

export const MOCK_PROPERTIES: Property[] = [
  {
    pand_id: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
    pand_naam: 'Penthouse Panorama',
    straat: 'Leien 45',
    plaats: 'Antwerpen',
    postcode: '2000',
    prijs: 895000,
    stijl: 'Penthouse',
    aantal_kamers: 3,
    laatste_notities: 'Exclusief pand met uitzicht op de Schelde.',
    created_at: threeDaysAgo,
    latitude: 51.2194,
    longitude: 4.4025,
  },
  {
    pand_id: 'd290f1ee-6c54-4b01-90e6-d701748f0852',
    pand_naam: 'Kot Studentenstad',
    straat: 'Sint-Pietersnieuwstraat 102',
    plaats: 'Gent',
    postcode: '9000',
    prijs: 125000,
    stijl: 'Studio',
    aantal_kamers: 1,
    laatste_notities: 'Ideale investering, altijd verhuurd.',
    created_at: now,
    latitude: 51.0543,
    longitude: 3.7174,
  },
  {
    pand_id: 'd290f1ee-6c54-4b01-90e6-d701748f0853',
    pand_naam: 'Hoeve de Oude Eik',
    straat: 'Veldstraat 1',
    plaats: 'Knokke-Heist',
    postcode: '8300',
    prijs: 1250000,
    stijl: 'Hoeve',
    aantal_kamers: 6,
    laatste_notities: 'Groot perceel, moet grondig gerenoveerd worden.',
    created_at: lastWeek,
    latitude: 51.3601,
    longitude: 3.2897,
  },
  {
    pand_id: 'd290f1ee-6c54-4b01-90e6-d701748f0854',
    pand_naam: 'Modern Gezinswoning',
    straat: 'Begoniastraat 14',
    plaats: 'Mechelen',
    postcode: '2800',
    prijs: 420000,
    stijl: 'Rijhuis',
    aantal_kamers: 4,
    laatste_notities: 'Instapklaar, EPC A label.',
    created_at: oneDayAgo,
    latitude: 51.0259,
    longitude: 4.4776,
  },
  {
    pand_id: 'd290f1ee-6c54-4b01-90e6-d701748f0855',
    pand_naam: 'Duplex aan Zee',
    straat: 'Zeedijk 200',
    plaats: 'Oostende',
    postcode: '8400',
    prijs: 550000,
    stijl: 'Appartement',
    aantal_kamers: 2,
    laatste_notities: 'Frontaal zeezicht, zonnig terras.',
    created_at: lastMonth,
    latitude: 51.2297,
    longitude: 2.9160,
  },
  {
    pand_id: 'd290f1ee-6c54-4b01-90e6-d701748f0856',
    pand_naam: 'Charmante Stadsvilla',
    straat: 'Krijgslaan 12',
    plaats: 'Gent',
    postcode: '9000',
    prijs: 725000,
    stijl: 'Villa',
    aantal_kamers: 4,
    laatste_notities: 'Prachtige tuin, rustige buurt.',
    created_at: twoDaysAgo,
    latitude: 51.0380,
    longitude: 3.7220,
  },
  {
    pand_id: 'd290f1ee-6c54-4b01-90e6-d701748f0857',
    pand_naam: 'Loft 55',
    straat: 'Dok Noord 55',
    plaats: 'Gent',
    postcode: '9000',
    prijs: 345000,
    stijl: 'Loft',
    aantal_kamers: 1,
    laatste_notities: 'Industriële look, parketvloer.',
    created_at: testWeek,
    latitude: 51.0718,
    longitude: 3.7282,
  },
  {
    pand_id: 'd290f1ee-6c54-4b01-90e6-d701748f0858',
    pand_naam: 'Bungalow Parkbos',
    straat: 'Kastanjelaan 8',
    plaats: 'Sint-Martens-Latem',
    postcode: '9830',
    prijs: 980000,
    stijl: 'Bungalow',
    aantal_kamers: 3,
    laatste_notities: 'Gelegen in bosrijke omgeving.',
    created_at: fourDaysAgo,
    latitude: 51.0011,
    longitude: 3.6411,
  },
  {
    pand_id: 'd290f1ee-6c54-4b01-90e6-d701748f0859',
    pand_naam: 'Landhuis Groenendaal',
    straat: 'Bosstraat 24',
    plaats: 'Hoeilaart',
    postcode: '1560',
    prijs: 1550000,
    stijl: 'Landhuis',
    aantal_kamers: 5,
    laatste_notities: 'Historisch pand, veel privacy.',
    created_at: lastMonth,
    latitude: 50.7645,
    longitude: 4.4613,
  },
  {
    pand_id: 'd290f1ee-6c54-4b01-90e6-d701748f0860',
    pand_naam: 'Renovatieproject Centrum',
    straat: 'Gasthuisstraat 3',
    plaats: 'Turnhout',
    postcode: '2300',
    prijs: 185000,
    stijl: 'Rijhuis',
    aantal_kamers: 2,
    laatste_notities: 'Volledig te strippen.',
    created_at: oneDayAgo,
    latitude: 51.3224,
    longitude: 4.9439,
  },
  {
    pand_id: 'd290f1ee-6c54-4b01-90e6-d701748f0861',
    pand_naam: 'Design Woning',
    straat: 'Albert I-laan 44',
    plaats: 'Nieuwpoort',
    postcode: '8620',
    prijs: 640000,
    stijl: 'Villa',
    aantal_kamers: 3,
    laatste_notities: 'Architectenwoning, uniek ontwerp.',
    created_at: threeDaysAgo,
    latitude: 51.1282,
    longitude: 2.7521,
  },
  {
    pand_id: 'd290f1ee-6c54-4b01-90e6-d701748f0862',
    pand_naam: 'Kantoorruimte Expo',
    straat: 'Jan Van Rijswijcklaan 191',
    plaats: 'Antwerpen',
    postcode: '2020',
    prijs: 495000,
    stijl: 'Kantoor',
    aantal_kamers: 5,
    laatste_notities: 'Ook geschikt voor praktijkruimte.',
    created_at: lastWeek,
    latitude: 51.2067,
    longitude: 4.4175,
  }
];

export const MOCK_CLIENTS: Client[] = [
  {
    klant_id: "7b2e3a1f-4b01-4c1f-90e6-d701748f0851",
    klant_naam: "Marc De Smet",
    telefoon: "+32 470 11 22 33",
    email: "marc.desmet@proximus.be",
    status: "Verkoopt",
    notities: "Wilt groter gaan wonen, zoekt hoeve regio Knokke.",
    created_at: lastMonth
  },
  {
    klant_id: "7b2e3a1f-4b01-4c1f-90e6-d701748f0852",
    klant_naam: "Annelies Peeters",
    telefoon: "+32 480 44 55 66",
    email: "annelies.p@telenet.be",
    status: "Zoekt",
    notities: "Zoekt eerste woning in Mechelen, budget max 450k.",
    created_at: now
  },
  {
    klant_id: "7b2e3a1f-4b01-4c1f-90e6-d701748f0853",
    klant_naam: "Thomas Vandamme",
    telefoon: "+32 490 77 88 99",
    email: "thomas.v@outlook.com",
    status: "Potentieel",
    notities: "Belegger interested in studentenvastgoed.",
    created_at: lastWeek
  },
  {
    klant_id: "7b2e3a1f-4b01-4c1f-90e6-d701748f0854",
    klant_naam: "Sarah Cools",
    telefoon: "+32 475 22 33 44",
    email: "sarah.cools@gmail.com",
    status: "Zoekt",
    notities: "Zoekt loft in Gent centrum.",
    created_at: oneDayAgo
  },
  {
    klant_id: "7b2e3a1f-4b01-4c1f-90e6-d701748f0855",
    klant_naam: "Peter Janssens",
    telefoon: "+32 485 11 22 33",
    email: "p.janssens@telenet.be",
    status: "Potentieel",
    notities: "Interested in renovatieprojecten.",
    created_at: twoDaysAgo
  },
  {
    klant_id: "7b2e3a1f-4b01-4c1f-90e6-d701748f0856",
    klant_naam: "Ellen Maes",
    telefoon: "+32 495 55 66 77",
    email: "ellen.maes@proximus.be",
    status: "Verkoopt",
    notities: "Wilt kleiner wonen na pensioen.",
    created_at: fourDaysAgo
  },
  {
    klant_id: "7b2e3a1f-4b01-4c1f-90e6-d701748f0857",
    klant_naam: "Koenraad Willems",
    telefoon: "+32 471 88 99 00",
    email: "koen.w@gmail.com",
    status: "Zoekt",
    notities: "Zoekt kantoorruimte voor zijn IT bedrijf.",
    created_at: threeDaysAgo
  },
  {
    klant_id: "7b2e3a1f-4b01-4c1f-90e6-d701748f0858",
    klant_naam: "Inge Verbruggen",
    telefoon: "+32 481 22 33 44",
    email: "inge.v@skynet.be",
    status: "Potentieel",
    notities: "Wacht op erfenis voor aankoop tweede verblijf.",
    created_at: testWeek
  },
  {
    klant_id: "7b2e3a1f-4b01-4c1f-90e6-d701748f0859",
    klant_naam: "Dirk Martens",
    telefoon: "+32 491 66 77 88",
    email: "dirk.martens@telenet.be",
    status: "Zoekt",
    notities: "Zoekt landhuis met veel grond.",
    created_at: lastMonth
  },
  {
    klant_id: "7b2e3a1f-4b01-4c1f-90e6-d701748f0860",
    klant_naam: "Els Van Damme",
    telefoon: "+32 472 00 11 22",
    email: "els.vd@gmail.com",
    status: "Potentieel",
    notities: "Checkt regelmatig aanbod in Oostende.",
    created_at: oneDayAgo
  }
];

export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    afspraken_id: "af839c8a-4b01-4c1f-90e6-d701748f0851",
    titel: "Bezichtiging Hoeve de Oude Eik",
    datum: withTime(tomorrow, 10, 30),
    klant_id: "7b2e3a1f-4b01-4c1f-90e6-d701748f0851",
    client_name: "Marc De Smet",
    pand_id: "d290f1ee-6c54-4b01-90e6-d701748f0853",
    property_name: "Hoeve de Oude Eik",
    notities: "Klant brengt architect mee."
  },
  {
    afspraken_id: "af839c8a-4b01-4c1f-90e6-d701748f0852",
    titel: "Bespreking Verkoop Penthouse",
    datum: withTime(dayAfter, 14, 0),
    klant_id: "7b2e3a1f-4b01-4c1f-90e6-d701748f0852",
    client_name: "Annelies Peeters",
    pand_id: "d290f1ee-6c54-4b01-90e6-d701748f0851",
    property_name: "Penthouse Panorama",
    notities: "Bespreken van de commissie."
  },
  {
    afspraken_id: "af839c8a-4b01-4c1f-90e6-d701748f0853",
    titel: "Intake Loft 55",
    datum: withTime(new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), 11, 15),
    klant_id: "7b2e3a1f-4b01-4c1f-90e6-d701748f0854",
    client_name: "Sarah Cools",
    pand_id: "d290f1ee-6c54-4b01-90e6-d701748f0857",
    property_name: "Loft 55",
    notities: "Klant wilt weten of huisdieren zijn toegestaan."
  },
  {
    afspraken_id: "af839c8a-4b01-4c1f-90e6-d701748f0854",
    titel: "Tweede bezoek Gezinswoning",
    datum: withTime(new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000), 16, 45),
    klant_id: "7b2e3a1f-4b01-4c1f-90e6-d701748f0852",
    client_name: "Annelies Peeters",
    pand_id: "d290f1ee-6c54-4b01-90e6-d701748f0854",
    property_name: "Modern Gezinswoning",
    notities: "Ouders komen ook mee kijken."
  },
  {
    afspraken_id: "af839c8a-4b01-4c1f-90e6-d701748f0855",
    titel: "Schattingsgesprek Latem",
    datum: withTime(new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), 9, 30),
    klant_id: "7b2e3a1f-4b01-4c1f-90e6-d701748f0856",
    client_name: "Ellen Maes",
    notities: "Schattingsverslag opmaken voor herverkoop."
  },
  {
    afspraken_id: "af839c8a-4b01-4c1f-90e6-d701748f0856",
    titel: "Contactmoment Belegger",
    datum: withTime(new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000), 13, 15),
    klant_id: "7b2e3a1f-4b01-4c1f-90e6-d701748f0853",
    client_name: "Thomas Vandamme",
    pand_id: "d290f1ee-6c54-4b01-90e6-d701748f0852",
    property_name: "Kot Studentenstad",
    notities: "Bespreken van rendement en huurinkomsten."
  },
  {
    afspraken_id: "af839c8a-4b01-4c1f-90e6-d701748f0857",
    titel: "Bezoek Kantoorruimte",
    datum: withTime(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), 15, 45),
    klant_id: "7b2e3a1f-4b01-4c1f-90e6-d701748f0857",
    client_name: "Koenraad Willems",
    pand_id: "d290f1ee-6c54-4b01-90e6-d701748f0862",
    property_name: "Kantoorruimte Expo",
    notities: "Checken van internetsnelheid en bekabeling."
  },
  {
    afspraken_id: "af839c8a-4b01-4c1f-90e6-d701748f0858",
    titel: "Rondleiding Design Woning",
    datum: withTime(new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000), 18, 0),
    klant_id: "7b2e3a1f-4b01-4c1f-90e6-d701748f0860",
    client_name: "Els Van Damme",
    pand_id: "d290f1ee-6c54-4b01-90e6-d701748f0861",
    property_name: "Design Woning",
    notities: "Exclusief bezoek buiten kantooruren."
  }
];