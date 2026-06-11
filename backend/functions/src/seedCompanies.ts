import * as admin from "firebase-admin";

// Seed script: Populate Firestore with NSE/BSE companies
// Run: npx ts-node seedCompanies.ts
// DO NOT run in production without review

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID || "sentimentai-48241"
});

const db = admin.firestore();

const COMPANIES: { symbol: string; companyName: string; exchange: string; sector: string; industry: string }[] = [
  { symbol: "RELIANCE", companyName: "Reliance Industries Ltd", exchange: "NSE", sector: "Oil & Gas", industry: "Refining & Marketing" },
  { symbol: "TCS", companyName: "Tata Consultancy Services Ltd", exchange: "NSE", sector: "Information Technology", industry: "IT Services" },
  { symbol: "INFY", companyName: "Infosys Ltd", exchange: "NSE", sector: "Information Technology", industry: "IT Services" },
  { symbol: "HDFCBANK", companyName: "HDFC Bank Ltd", exchange: "NSE", sector: "Banking", industry: "Private Sector Bank" },
  { symbol: "ICICIBANK", companyName: "ICICI Bank Ltd", exchange: "NSE", sector: "Banking", industry: "Private Sector Bank" },
  { symbol: "HINDUNILVR", companyName: "Hindustan Unilever Ltd", exchange: "NSE", sector: "FMCG", industry: "Household & Personal Care" },
  { symbol: "ITC", companyName: "ITC Ltd", exchange: "NSE", sector: "FMCG", industry: "Cigarettes & Tobacco" },
  { symbol: "SBIN", companyName: "State Bank of India", exchange: "NSE", sector: "Banking", industry: "Public Sector Bank" },
  { symbol: "BHARTIARTL", companyName: "Bharti Airtel Ltd", exchange: "NSE", sector: "Telecom", industry: "Telecom Services" },
  { symbol: "KOTAKBANK", companyName: "Kotak Mahindra Bank Ltd", exchange: "NSE", sector: "Banking", industry: "Private Sector Bank" },
  { symbol: "LT", companyName: "Larsen & Toubro Ltd", exchange: "NSE", sector: "Capital Goods", industry: "Engineering" },
  { symbol: "WIPRO", companyName: "Wipro Ltd", exchange: "NSE", sector: "Information Technology", industry: "IT Services" },
  { symbol: "AXISBANK", companyName: "Axis Bank Ltd", exchange: "NSE", sector: "Banking", industry: "Private Sector Bank" },
  { symbol: "BAJFINANCE", companyName: "Bajaj Finance Ltd", exchange: "NSE", sector: "Finance", industry: "NBFC" },
  { symbol: "MARUTI", companyName: "Maruti Suzuki India Ltd", exchange: "NSE", sector: "Automobile", industry: "Passenger Cars" },
  { symbol: "SUNPHARMA", companyName: "Sun Pharmaceutical Industries Ltd", exchange: "NSE", sector: "Pharma", industry: "Pharmaceuticals" },
  { symbol: "TITAN", companyName: "Titan Company Ltd", exchange: "NSE", sector: "Consumer Goods", industry: "Watches & Jewellery" },
  { symbol: "TATAMOTORS", companyName: "Tata Motors Ltd", exchange: "NSE", sector: "Automobile", industry: "Commercial Vehicles" },
  { symbol: "TATASTEEL", companyName: "Tata Steel Ltd", exchange: "NSE", sector: "Metals", industry: "Steel" },
  { symbol: "ADANIENT", companyName: "Adani Enterprises Ltd", exchange: "NSE", sector: "Conglomerate", industry: "Diversified" },
  { symbol: "ADANIPORTS", companyName: "Adani Ports & SEZ Ltd", exchange: "NSE", sector: "Infrastructure", industry: "Ports" },
  { symbol: "ASIANPAINT", companyName: "Asian Paints Ltd", exchange: "NSE", sector: "Consumer Goods", industry: "Paints" },
  { symbol: "BAJAJFINSV", companyName: "Bajaj Finserv Ltd", exchange: "NSE", sector: "Finance", industry: "Insurance & Lending" },
  { symbol: "BPCL", companyName: "Bharat Petroleum Corp Ltd", exchange: "NSE", sector: "Oil & Gas", industry: "Refining & Marketing" },
  { symbol: "BRITANNIA", companyName: "Britannia Industries Ltd", exchange: "NSE", sector: "FMCG", industry: "Food Products" },
  { symbol: "CIPLA", companyName: "Cipla Ltd", exchange: "NSE", sector: "Pharma", industry: "Pharmaceuticals" },
  { symbol: "COALINDIA", companyName: "Coal India Ltd", exchange: "NSE", sector: "Mining", industry: "Coal" },
  { symbol: "DIVISLAB", companyName: "Divi's Laboratories Ltd", exchange: "NSE", sector: "Pharma", industry: "Pharmaceuticals" },
  { symbol: "DRREDDY", companyName: "Dr Reddys Laboratories Ltd", exchange: "NSE", sector: "Pharma", industry: "Pharmaceuticals" },
  { symbol: "EICHERMOT", companyName: "Eicher Motors Ltd", exchange: "NSE", sector: "Automobile", industry: "Motorcycles" },
  { symbol: "GRASIM", companyName: "Grasim Industries Ltd", exchange: "NSE", sector: "Cement", industry: "Cement & Viscose" },
  { symbol: "HCLTECH", companyName: "HCL Technologies Ltd", exchange: "NSE", sector: "Information Technology", industry: "IT Services" },
  { symbol: "HDFCLIFE", companyName: "HDFC Life Insurance Co Ltd", exchange: "NSE", sector: "Insurance", industry: "Life Insurance" },
  { symbol: "HEROMOTOCO", companyName: "Hero MotoCorp Ltd", exchange: "NSE", sector: "Automobile", industry: "Motorcycles" },
  { symbol: "HINDALCO", companyName: "Hindalco Industries Ltd", exchange: "NSE", sector: "Metals", industry: "Aluminium" },
  { symbol: "IOC", companyName: "Indian Oil Corp Ltd", exchange: "NSE", sector: "Oil & Gas", industry: "Refining & Marketing" },
  { symbol: "INDUSINDBK", companyName: "IndusInd Bank Ltd", exchange: "NSE", sector: "Banking", industry: "Private Sector Bank" },
  { symbol: "JSWSTEEL", companyName: "JSW Steel Ltd", exchange: "NSE", sector: "Metals", industry: "Steel" },
  { symbol: "M_M", companyName: "Mahindra & Mahindra Ltd", exchange: "NSE", sector: "Automobile", industry: "Utility Vehicles" },
  { symbol: "NESTLEIND", companyName: "Nestle India Ltd", exchange: "NSE", sector: "FMCG", industry: "Food Products" },
  { symbol: "NTPC", companyName: "NTPC Ltd", exchange: "NSE", sector: "Power", industry: "Thermal Power" },
  { symbol: "ONGC", companyName: "Oil & Natural Gas Corp Ltd", exchange: "NSE", sector: "Oil & Gas", industry: "Exploration & Production" },
  { symbol: "POWERGRID", companyName: "Power Grid Corp of India Ltd", exchange: "NSE", sector: "Power", industry: "Power Transmission" },
  { symbol: "RELIANCE", companyName: "Reliance Industries Ltd", exchange: "NSE", sector: "Oil & Gas", industry: "Refining & Marketing" },
  { symbol: "SBILIFE", companyName: "SBI Life Insurance Co Ltd", exchange: "NSE", sector: "Insurance", industry: "Life Insurance" },
  { symbol: "TECHM", companyName: "Tech Mahindra Ltd", exchange: "NSE", sector: "Information Technology", industry: "IT Services" },
  { symbol: "ULTRACEMCO", companyName: "UltraTech Cement Ltd", exchange: "NSE", sector: "Cement", industry: "Cement" },
  { symbol: "UPL", companyName: "UPL Ltd", exchange: "NSE", sector: "Chemicals", industry: "Agrochemicals" },
  { symbol: "ZOMATO", companyName: "Zomato Ltd", exchange: "NSE", sector: "Internet", industry: "Food Delivery" },
];

async function seed() {
  console.log(`Seeding ${COMPANIES.length} companies into Firestore...`);
  const batch = db.batch();
  let count = 0;

  for (const company of COMPANIES) {
    const ref = db.collection("companies").doc(company.symbol);
    batch.set(ref, {
      ...company,
      marketCap: 0,
      isActive: true,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    count++;
  }

  await batch.commit();
  console.log(`Successfully seeded ${count} companies.`);
  process.exit(0);
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
