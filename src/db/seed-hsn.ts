import { db } from "./client";
import { hsn_codes } from "./schema";

async function main() {
  console.log("Seeding HSN codes...");

  const data = [
    { hsn_code: '84150000', description: 'Air Conditioners', gst_rate: "28.00" },
    { hsn_code: '84180000', description: 'Refrigerators & Freezers', gst_rate: "18.00" },
    { hsn_code: '84500000', description: 'Washing Machines', gst_rate: "18.00" },
    { hsn_code: '85160000', description: 'Microwaves & Water Heaters', gst_rate: "18.00" },
    { hsn_code: '85280000', description: 'Televisions (Large)', gst_rate: "28.00" },
  ];

  const processedData = data.map(item => {
    const rate = parseFloat(item.gst_rate);
    const half = (rate / 2).toFixed(2);
    return {
      ...item,
      cgst_rate: half,
      sgst_rate: half,
      igst_rate: item.gst_rate
    };
  });

  await db.insert(hsn_codes)
    .values(processedData)
    .onConflictDoNothing({ target: hsn_codes.hsn_code });

  console.log("HSN codes seeded successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error seeding HSN codes:", err);
  process.exit(1);
});
