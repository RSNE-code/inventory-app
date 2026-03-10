import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Prisma } from "@prisma/client"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// ─── Active jobs from Knowify JobsReport 03-10-26 ───

interface JobRow {
  Job: string
  "GC Ref": string
  "Contract #": string | number
  Client: string
  Contact: string
  Address: string
  City: string
  "Proposal Date": string
  "Contract Value": number
  Services: string
  "Est.Start Date": string
  "Est.End Date": string
  "% Billed": number
  "Sales Lead": string
  "Project Manager": string
}

function parseJobNumber(jobField: string): { number: string | null; name: string } {
  // Patterns: "24052 Downey Elementary...", "M25638 Monogram...", "S25769 Joseph's..."
  const match = jobField.match(/^([A-Z]?\d{4,6})\s+(.+)$/)
  if (match) {
    return { number: match[1], name: match[2].trim() }
  }
  // No number prefix — use full string as name
  return { number: null, name: jobField.trim() }
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? null : d
}

const jobs: JobRow[] = [
  { Job: "24052 Downey Elementary School Cooler", "GC Ref": "", "Contract #": "31629 - Email 1/7/26", Client: "Janco Sales & Service Inc", Contact: "Edward Jannini", Address: "55 Electric Avenue", City: "Brockton", "Proposal Date": "9/19/2025", "Contract Value": 23140.67, Services: "Installation Services, Installation Materials", "Est.Start Date": "4/14/2026", "Est.End Date": "", "% Billed": 0, "Sales Lead": "Joe Tavares", "Project Manager": "Joe Tavares" },
  { Job: "24343 McGee BMW, Audi, VW", "GC Ref": "", "Contract #": "", Client: "CM&B", Contact: "Greg Bongo", Address: "", City: "", "Proposal Date": "4/2/2025", "Contract Value": 343124.47, Services: "Installation & Service Labor, Equipment, Travel & Fees, Wayside Glass Replacement Panels", "Est.Start Date": "", "Est.End Date": "", "% Billed": 1, "Sales Lead": "Ryan Gilligan", "Project Manager": "Ryan Gilligan" },
  { Job: "24387 Venus De Milo", "GC Ref": "", "Contract #": "", Client: "VENUS DE MILO", Contact: "Monte Ferris", Address: "75 GAR Highway", City: "Swansea", "Proposal Date": "9/15/2025", "Contract Value": 21180, Services: "Installation Materials, Installation Services", "Est.Start Date": "12/29/2025", "Est.End Date": "1/2/2026", "% Billed": 1, "Sales Lead": "Gregory Watka", "Project Manager": "Gregory Watka" },
  { Job: "25164 Stavis Production Room & 2nd Floor", "GC Ref": "", "Contract #": "", Client: "Stavis Seafood", Contact: "Eric Mosonyi", Address: "1 Seafood Way", City: "Boston", "Proposal Date": "4/3/2025", "Contract Value": 435373.41, Services: "Installation Services, Clean Room FRP Doors, Exterior 5\" Panel Replacement, Installation & Service Labor, Equipment, Travel & Fees, Installation & Service Materials, Hormann Impact Doors", "Est.Start Date": "4/3/2025", "Est.End Date": "", "% Billed": 0.91, "Sales Lead": "Ryan Gilligan", "Project Manager": "Ryan Gilligan" },
  { Job: "25209 VA Medical Center - West Roxbury", "GC Ref": "523A4-25-001", "Contract #": "523A4-25-001", Client: "Monument Construction Services", Contact: "Paige Millen", Address: "1400 VFW Parkway", City: "West Roxbury", "Proposal Date": "3/28/2025", "Contract Value": 57969, Services: "Cooler #2 SF increase, Scope #1 Labor, Scope #2 Labor, Scope #1 Materials, Scope #2 Materials", "Est.Start Date": "5/9/2025", "Est.End Date": "", "% Billed": 1, "Sales Lead": "Gregory Watka", "Project Manager": "Gregory Watka" },
  { Job: "25240 Roche Brothers Sudbury Farms Renovation", "GC Ref": "", "Contract #": "QUOTE Dated 5/22/2025", Client: "One Construction", Contact: "One Construction", Address: "439 Boston Post Road", City: "Sudbury", "Proposal Date": "6/16/2025", "Contract Value": 424813.64, Services: "Produce, Deli & Floral Installation, Meat Cooler/Freezer & Prep Materials, Grocery Freezer/Dairy Cooler Materials & Installation", "Est.Start Date": "7/14/2025", "Est.End Date": "", "% Billed": 1, "Sales Lead": "Gregory Watka", "Project Manager": "" },
  { Job: "25284 Pammy's", "GC Ref": "", "Contract #": "", Client: "Pammy's", Contact: "Chris Willis", Address: "928 Massachusetts Avenue", City: "Cambridge", "Proposal Date": "7/8/2025", "Contract Value": 6347.01, Services: "Installation Services, Floor Structure Demo and Rebuild, Floor Panel - 8' (Qty: 2 ea), Installation Materials", "Est.Start Date": "8/18/2025", "Est.End Date": "", "% Billed": 1, "Sales Lead": "Joe Tavares", "Project Manager": "Joe Tavares" },
  { Job: "25318 Aldi Saxonburg Expansion", "GC Ref": "", "Contract #": "24.005.1008", Client: "AM King", Contact: "Harrison Stafford", Address: "6000 North Noah Drive", City: "Saxonburg", "Proposal Date": "4/25/2025", "Contract Value": 1260000, Services: "Insulated Man Doors, Shop Drawings, Labor, Insulated Metal Panels & Accessories, Floor Insulation and Iso Blocks", "Est.Start Date": "11/19/2025", "Est.End Date": "", "% Billed": 0.83, "Sales Lead": "David McGrath", "Project Manager": "Ryan Gilligan" },
  { Job: "25324 Star Market Newton", "GC Ref": "", "Contract #": "", Client: "Vertec Corp", Contact: "Vertec Corp", Address: "33 Austin Street", City: "Newton", "Proposal Date": "7/2/2025", "Contract Value": 71803.06, Services: "Installation Materials, FRP Wall Liners Meat Cooler, Installation Services", "Est.Start Date": "10/13/2025", "Est.End Date": "", "% Billed": 1, "Sales Lead": "Ryan Gilligan", "Project Manager": "" },
  { Job: "25325 Roche Bros Wellesley", "GC Ref": "", "Contract #": "", Client: "Roche Bros. Supermarkets", Contact: "", Address: "184 Linden Street", City: "Wellesley", "Proposal Date": "9/2/2025", "Contract Value": 28750, Services: "Installation Services, Installation Materials", "Est.Start Date": "9/22/2025", "Est.End Date": "9/26/2025", "% Billed": 0, "Sales Lead": "Gregory Watka", "Project Manager": "Gregory Watka" },
  { Job: "25333 VA Brockton Bldg 20", "GC Ref": "36C24125N1157 - 523A5-25-002", "Contract #": "SC-001", Client: "Monument Construction Services", Contact: "Paige Millen", Address: "940 Belmont Street", City: "Brockton", "Proposal Date": "5/19/2025", "Contract Value": 160018, Services: "BLDG 20 Room 102J, BLDG 20 Room 112, BLDG 20 Room 110C, BLDG 20 Room 113, BLDG 20 Room 109A", "Est.Start Date": "9/30/2025", "Est.End Date": "", "% Billed": 0, "Sales Lead": "Gregory Watka", "Project Manager": "Ryan Gilligan" },
  { Job: "25367 Mutual Produce", "GC Ref": "", "Contract #": "Signed Quote 10.15.25", Client: "MUTUAL PRODUCE", Contact: "Trevor Ciovacco", Address: "300 Beacham Street", City: "Chelsea", "Proposal Date": "9/23/2025", "Contract Value": 143063.39, Services: "Installation Services, Refrigeration total, Installation Materials, Cooler Slider 8' x 8'", "Est.Start Date": "1/1/2026", "Est.End Date": "2/4/2026", "% Billed": 1, "Sales Lead": "Joe Tavares", "Project Manager": "Joe Tavares" },
  { Job: "25388 Deep Dairy", "GC Ref": "", "Contract #": "2025022-001", Client: "Conductor Construction Management", Contact: "Ed Brilliante", Address: "61 Swift Street", City: "Waterloo", "Proposal Date": "9/23/2025", "Contract Value": 206800, Services: "Installation Services, Installation Materials, Change Order #0001, Specialty Doors", "Est.Start Date": "", "Est.End Date": "", "% Billed": 0.77, "Sales Lead": "David McGrath", "Project Manager": "David McGrath" },
  { Job: "25392 Shawsheen Freezer Repairs", "GC Ref": "", "Contract #": "Signed Quote 10.30.25", Client: "B&D Holdings", Contact: "Abby Flynn", Address: "", City: "", "Proposal Date": "10/30/2025", "Contract Value": 51744, Services: "Installation Materials, Installation Services", "Est.Start Date": "2/2/2026", "Est.End Date": "", "% Billed": 0, "Sales Lead": "Gregory Watka", "Project Manager": "Gregory Watka" },
  { Job: "25399 Tavern in the Square Fitchburg", "GC Ref": "", "Contract #": "PO Dated 12/29/25", Client: "Harbour Food Service Equipment", Contact: "Harbour Service Equipment", Address: "170 Whalon Street", City: "Fitchburg", "Proposal Date": "11/4/2025", "Contract Value": 73233, Services: "Installation Materials, Installation Services", "Est.Start Date": "2/2/2026", "Est.End Date": "2/10/2026", "% Billed": 1, "Sales Lead": "Gregory Watka", "Project Manager": "Gregory Watka" },
  { Job: "25409 Elliot Farms", "GC Ref": "", "Contract #": "Quote Dated 4/24/25", Client: "Pierce Refrigeration", Contact: "Rick Dionne", Address: "202 Main Street", City: "Lakeville", "Proposal Date": "11/6/2025", "Contract Value": 60518, Services: "Installation Materials, Installation Services", "Est.Start Date": "3/9/2026", "Est.End Date": "", "% Billed": 0, "Sales Lead": "Gregory Watka", "Project Manager": "Gregory Watka" },
  { Job: "25415 South Kingstown High School", "GC Ref": "", "Contract #": "PO BS34459", Client: "GKT Refrigeration, Inc.", Contact: "", Address: "215 Columbia Street", City: "South Kingstown", "Proposal Date": "10/20/2025", "Contract Value": 6162.44, Services: "Freezer Door 36\" x 77 1/4\" (Qty.: 1 ea), Installation Services", "Est.Start Date": "1/2/2026", "Est.End Date": "1/2/2026", "% Billed": 1, "Sales Lead": "Joe Tavares", "Project Manager": "Joe Tavares" },
  { Job: "25419 Ocean Kingdom", "GC Ref": "", "Contract #": "25013-0746", Client: "Jewett", Contact: "Nick Jewett", Address: "25 Bath Street", City: "Providence", "Proposal Date": "11/20/2025", "Contract Value": 164000, Services: "Insulated Metal Panels, Labor, Floor Material, Insulated Cold Storage Door, Equipment Rental", "Est.Start Date": "1/5/2026", "Est.End Date": "", "% Billed": 1, "Sales Lead": "David McGrath", "Project Manager": "Joe Tavares" },
  { Job: "25427 Rochester Bode Building", "GC Ref": "", "Contract #": "PO22190 Dated 1/6/26", Client: "Bode Equipment", Contact: "Scott Fawcett", Address: "112 Airport Drive", City: "Rochester", "Proposal Date": "11/25/2025", "Contract Value": 62400, Services: "Installation Services", "Est.Start Date": "1/19/2026", "Est.End Date": "", "% Billed": 0, "Sales Lead": "David McGrath", "Project Manager": "David McGrath" },
  { Job: "25434 Electrochem", "GC Ref": "", "Contract #": "", Client: "Electrochem", Contact: "Scott O'Connell", Address: "670 Paramount Drive", City: "Raynham", "Proposal Date": "11/12/2025", "Contract Value": 64103.08, Services: "Installation Services, Installation Materials, Cooler Door 42\" x 7'", "Est.Start Date": "12/3/2025", "Est.End Date": "", "% Billed": 0, "Sales Lead": "Joe Tavares", "Project Manager": "Joe Tavares" },
  { Job: "25435 Red Jacket", "GC Ref": "", "Contract #": "", Client: "Harris Warren", Contact: "J.P. Griffin", Address: "1 South Shore Drive", City: "Yarmouth", "Proposal Date": "11/10/2025", "Contract Value": 38508.46, Services: "Installation Materials, Installation Services", "Est.Start Date": "12/3/2025", "Est.End Date": "", "% Billed": 0, "Sales Lead": "Joe Tavares", "Project Manager": "Joe Tavares" },
  { Job: "25437 Whole Foods Medford", "GC Ref": "", "Contract #": "297342", Client: "ARC Mechanical", Contact: "Joe Marella", Address: "2151 Mystic Valley Pkwy", City: "Medford", "Proposal Date": "9/29/2025", "Contract Value": 26070.43, Services: "Installation Services, Installation Materials, Freezer Door 5' x 7'", "Est.Start Date": "1/12/2026", "Est.End Date": "", "% Billed": 0, "Sales Lead": "Joe Tavares", "Project Manager": "Joe Tavares" },
  { Job: "25443 Tase Rite", "GC Ref": "", "Contract #": "Signed Proposal 12.10.25", Client: "Tase-Rite Co.", Contact: "Gary", Address: "1211 Kingstown Road", City: "South Kingstown", "Proposal Date": "11/17/2025", "Contract Value": 10795.35, Services: "Installation Services, (2) Freezer Door 34\" x 75\"", "Est.Start Date": "3/5/2026", "Est.End Date": "", "% Billed": 1, "Sales Lead": "Joe Tavares", "Project Manager": "Joe Tavares" },
  { Job: "25448 Sudbury Farms Needham Grocery, Bakery and Produce, Meat Cooler", "GC Ref": "", "Contract #": "", Client: "One Construction", Contact: "One Construction", Address: "1177 Highland Avenue", City: "Needham", "Proposal Date": "12/15/2025", "Contract Value": 158905.87, Services: "Installation Materials, Installation Services Night work, Installation Materials Meat Cooler, Installation Services Meat Cooler", "Est.Start Date": "1/7/2026", "Est.End Date": "3/28/2026", "% Billed": 0.81, "Sales Lead": "Joe Tavares", "Project Manager": "Joe Tavares" },
  { Job: "25451 Woodland Golf club", "GC Ref": "", "Contract #": "PROJ#M2025-590", Client: "LC Anderson", Contact: "Mike Vigneau", Address: "1897 Washington Street", City: "Newton", "Proposal Date": "8/29/2025", "Contract Value": 72100.93, Services: "Floor Panel - 8' (Qty: 5 ea) Freezer, Installation Materials, Cooler Door 3' x 78\", Installation Services, Floor Panel - 10' Cooler, Freezer Door 3' x 78\"", "Est.Start Date": "2/3/2026", "Est.End Date": "2/16/2026", "% Billed": 1, "Sales Lead": "Joe Tavares", "Project Manager": "Joe Tavares" },
  { Job: "25452 Alice Cambridge Restaurant", "GC Ref": "", "Contract #": "Quote Dated 12.28.25", Client: "Harbour Food Service Equipment", Contact: "Harbour Service Equipment", Address: "238 Main Street", City: "Cambridge", "Proposal Date": "12/29/2025", "Contract Value": 16314, Services: "Installation Materials, Installation Services", "Est.Start Date": "1/26/2026", "Est.End Date": "", "% Billed": 0, "Sales Lead": "Joe Tavares", "Project Manager": "Joe Tavares" },
  { Job: "26101 Johnson Farms Display Doors", "GC Ref": "", "Contract #": "", Client: "Johnson Farms", Contact: "Tim Johnson", Address: "445 Market Street", City: "Swansea", "Proposal Date": "12/22/2025", "Contract Value": 19336.5, Services: "Freezer Display Door, Installation Services, Installation Materials", "Est.Start Date": "3/12/2026", "Est.End Date": "3/13/2026", "% Billed": 0.1, "Sales Lead": "Joe Tavares", "Project Manager": "Joe Tavares" },
  { Job: "26104 Aberjona Rehabilitation & Nursing Center | Salter HealthCare", "GC Ref": "", "Contract #": "", Client: "Salter Health Care", Contact: "Scott Kappotis", Address: "184 Swanton Street", City: "Winchester", "Proposal Date": "9/8/2025", "Contract Value": 10772.3, Services: "Installation Materials, Freezer Door 35\" x 78\", Installation Services", "Est.Start Date": "3/5/2026", "Est.End Date": "", "% Billed": 0, "Sales Lead": "Joe Tavares", "Project Manager": "Joe Tavares" },
  { Job: "26106 Flying Bridge 8'X26' WI-Combo", "GC Ref": "", "Contract #": "Email Dated 1.19.26", Client: "Harris Warren", Contact: "J.P. Griffin", Address: "220 Scranton Avenue", City: "Falmouth", "Proposal Date": "9/8/2025", "Contract Value": 38769.6, Services: "Installation Services, Freezer Door High Sill 3' x 80\", Freezer Ramp, Installation Materials, Floor Panel - 8', Cooler Door 3' x 80\"", "Est.Start Date": "3/9/2026", "Est.End Date": "", "% Billed": 0, "Sales Lead": "Joe Tavares", "Project Manager": "Joe Tavares" },
  { Job: "26112 Tedesco Country Club", "GC Ref": "", "Contract #": "", Client: "Tedesco Country Club", Contact: "Alcedo Mato", Address: "154 Tedesco Street", City: "Marblehead", "Proposal Date": "1/28/2026", "Contract Value": 4598.18, Services: "Installation Materials, Installation Services", "Est.Start Date": "3/9/2026", "Est.End Date": "", "% Billed": 1, "Sales Lead": "Joe Tavares", "Project Manager": "Joe Tavares" },
  { Job: "26113 East Bay Pantry", "GC Ref": "", "Contract #": "Sub Agreement", Client: "JPS Construction & Design", Contact: "Jonathan Camelo", Address: "532 Wood Street", City: "Bristol", "Proposal Date": "2/2/2026", "Contract Value": 59514, Services: "Installation Services, Installation Materials", "Est.Start Date": "", "Est.End Date": "", "% Billed": 0, "Sales Lead": "Gregory Watka", "Project Manager": "Gregory Watka" },
  { Job: "26114 Worcester Polytechnic Institute", "GC Ref": "", "Contract #": "Email Dated 2/2/26", Client: "Worcester Poly Tech - Chartwells Higher Ed", Contact: "Robert Wilder", Address: "100 Institute Rd.", City: "Worcester", "Proposal Date": "12/11/2025", "Contract Value": 6339, Services: "Installation Services, Freezer Door 3' x 7'", "Est.Start Date": "3/11/2026", "Est.End Date": "", "% Billed": 0, "Sales Lead": "Joe Tavares", "Project Manager": "Joe Tavares" },
  { Job: "26115 Avecia - Floor Repair", "GC Ref": "", "Contract #": "Project #M2026-606", Client: "LC Anderson", Contact: "Mike Vigneau", Address: "155 Fortune Boulevard", City: "Milford", "Proposal Date": "1/21/2026", "Contract Value": 3562.72, Services: "Installation Materials - Floor", "Est.Start Date": "2/3/2026", "Est.End Date": "", "% Billed": 0, "Sales Lead": "Joe Tavares", "Project Manager": "Joe Tavares" },
  { Job: "26116 Burger King Medford", "GC Ref": "", "Contract #": "Signed Agreement 2.3.26", Client: "C & D Cooling", Contact: "Charlie Hockman", Address: "383 Mystic Avenue", City: "Medford", "Proposal Date": "1/16/2026", "Contract Value": 5900.8, Services: "Installation Services, Installation Materials", "Est.Start Date": "3/10/2026", "Est.End Date": "", "% Billed": 0, "Sales Lead": "Joe Tavares", "Project Manager": "Joe Tavares" },
  { Job: "26118 DPW Westborough Repair", "GC Ref": "", "Contract #": "", Client: "TRUBUILD", Contact: "Don Allan", Address: "", City: "", "Proposal Date": "1/30/2026", "Contract Value": 71149.09, Services: "Installation Materials, Installation Services", "Est.Start Date": "4/10/2026", "Est.End Date": "", "% Billed": 0, "Sales Lead": "Joe Tavares", "Project Manager": "Joe Tavares" },
  { Job: "26119 Olive Garden Marlborough", "GC Ref": "", "Contract #": "Signed Quote 2.12.26", Client: "Invernizzi Construction Co. Inc", Contact: "Nick Invernizzi", Address: "728 Donald Lynch Boulevard", City: "Marlborough", "Proposal Date": "2/10/2026", "Contract Value": 6355, Services: "Installation Materials, Installation Services", "Est.Start Date": "3/23/2026", "Est.End Date": "", "% Billed": 0, "Sales Lead": "Joe Tavares", "Project Manager": "Joe Tavares" },
  { Job: "26120 Crisp Too", "GC Ref": "", "Contract #": "Signed Agreement 2.16.26", Client: "Fitzy's Refrigeration & A/C", Contact: "David Fitzpatrick", Address: "770 Main Street", City: "Barnstable", "Proposal Date": "2/16/2026", "Contract Value": 24591, Services: "Installation Materials, Installation Services", "Est.Start Date": "3/30/2026", "Est.End Date": "", "% Billed": 0, "Sales Lead": "Gregory Watka", "Project Manager": "Gregory Watka" },
  { Job: "26121 Pressed Cafe", "GC Ref": "", "Contract #": "Project #J067380", Client: "TriMark United East", Contact: "TriMark East", Address: "200 District Avenue", City: "Burlington", "Proposal Date": "2/10/2026", "Contract Value": 123985.41, Services: "Installation Materials, Installation Services", "Est.Start Date": "3/10/2026", "Est.End Date": "", "% Billed": 0, "Sales Lead": "David McGrath", "Project Manager": "David McGrath" },
  { Job: "26122 Sopra Restaurant", "GC Ref": "", "Contract #": "", Client: "Harbour Food Service Equipment", Contact: "Harbour Service Equipment", Address: "66 Cross Street", City: "Boston", "Proposal Date": "2/23/2026", "Contract Value": 69941, Services: "Installation Materials, Installation Services", "Est.Start Date": "3/23/2026", "Est.End Date": "3/31/2026", "% Billed": 0, "Sales Lead": "Gregory Watka", "Project Manager": "Gregory Watka" },
  { Job: "26124 Woodland Variety & Grill Floor Replacement", "GC Ref": "", "Contract #": "", Client: "Woodland Variety & Grill", Contact: "Rob & Christina Baker", Address: "455 State Road", City: "Vineyard Haven", "Proposal Date": "2/26/2026", "Contract Value": 8936, Services: "Installation Services, Installation Materials, EDC Door Installation", "Est.Start Date": "4/6/2026", "Est.End Date": "", "% Billed": 0, "Sales Lead": "Gregory Watka", "Project Manager": "Gregory Watka" },
  { Job: "26127 Quattro Restaurant", "GC Ref": "", "Contract #": "", Client: "Harbour Food Service Equipment", Contact: "Harbour Service Equipment", Address: "264 Hanover Street", City: "Boston", "Proposal Date": "3/5/2026", "Contract Value": 10406, Services: "Installation Services, Installation Materials", "Est.Start Date": "3/5/2026", "Est.End Date": "", "% Billed": 0, "Sales Lead": "Gregory Watka", "Project Manager": "Gregory Watka" },
  { Job: "26128 Precision Broadhollow", "GC Ref": "", "Contract #": "", Client: "C&S Plastering", Contact: "Scott Massee", Address: "55 Edison Avenue", City: "West Babylon", "Proposal Date": "12/16/2025", "Contract Value": 74778.26, Services: "Installation Materials, EPS Wall/Ceiling Panel (4\") - 4 x 10 (Qty.: 96 ea)", "Est.Start Date": "", "Est.End Date": "", "% Billed": 0, "Sales Lead": "Joe Tavares", "Project Manager": "Joe Tavares" },
  { Job: "26129 Harmony Hill Combo Box", "GC Ref": "", "Contract #": "", Client: "GKT Refrigeration, Inc.", Contact: "", Address: "63 Harmony Hill Road", City: "Gloucester", "Proposal Date": "3/2/2026", "Contract Value": 41181, Services: "Installation Materials & Services", "Est.Start Date": "3/30/2026", "Est.End Date": "", "% Billed": 0, "Sales Lead": "Ryan Gilligan", "Project Manager": "Ryan Gilligan" },
  { Job: "26130 Horizon Logistics", "GC Ref": "", "Contract #": "Time and Material", Client: "Ambient Temperature Corporation", Contact: "", Address: "10 Kimball Lane", City: "Lynnfield", "Proposal Date": "3/6/2026", "Contract Value": 0, Services: "Installation Services, Installation Materials", "Est.Start Date": "3/6/2026", "Est.End Date": "", "% Billed": 0, "Sales Lead": "Gregory Watka", "Project Manager": "Gregory Watka" },
  { Job: "26131 Hornstra Farms Replacement Gaskets", "GC Ref": "", "Contract #": "", Client: "Hornstra Dairy Farm", Contact: "Hornstra Farm", Address: "246 Prospect ST.", City: "Norwell", "Proposal Date": "3/6/2026", "Contract Value": 1793.04, Services: "Installation Services, Installation Materials", "Est.Start Date": "3/6/2026", "Est.End Date": "", "% Billed": 0, "Sales Lead": "Joe Tavares", "Project Manager": "Joe Tavares" },
  { Job: "Acme Smoked Fish", "GC Ref": "", "Contract #": "", Client: "Acme Smoked Fish Corp", Contact: "Matthew Egan", Address: "76 Campanelli Industrial Drive", City: "Brockton", "Proposal Date": "4/29/2025", "Contract Value": 15112, Services: "Installation Services", "Est.Start Date": "10/30/2025", "Est.End Date": "", "% Billed": 0, "Sales Lead": "B - Robert Chase", "Project Manager": "" },
  { Job: "M25638 Monogram Wilmington Material Only Order", "GC Ref": "", "Contract #": "", Client: "Monogram Foods (Wilmington 330)", Contact: "Franky Alvarez", Address: "330 Ballardvale St", City: "Wilmington", "Proposal Date": "10/13/2025", "Contract Value": 365.96, Services: "Installation Materials", "Est.Start Date": "", "Est.End Date": "", "% Billed": 1, "Sales Lead": "B - Robert Chase", "Project Manager": "B - Robert Chase" },
  { Job: "M26504 Joe Warren (434840)", "GC Ref": "", "Contract #": "QTE#67160", Client: "Joe Warren & Sons", Contact: "Mark Stevens", Address: "", City: "", "Proposal Date": "1/28/2026", "Contract Value": 5125, Services: "Installation Materials", "Est.Start Date": "1/28/2026", "Est.End Date": "", "% Billed": 0, "Sales Lead": "Joe Tavares", "Project Manager": "Joe Tavares" },
  { Job: "M26505 Joe Warren (434853)", "GC Ref": "", "Contract #": "QTE#67159", Client: "Joe Warren & Sons", Contact: "Mark Stevens", Address: "", City: "", "Proposal Date": "1/28/2026", "Contract Value": 4225, Services: "Installation Materials", "Est.Start Date": "1/28/2026", "Est.End Date": "", "% Billed": 0, "Sales Lead": "Joe Tavares", "Project Manager": "Joe Tavares" },
  { Job: "M26511 ARC - Material Only 2.27.26", "GC Ref": "", "Contract #": "", Client: "ARC Mechanical", Contact: "Joe Marella", Address: "230 Ballardvale Street", City: "Wilmington", "Proposal Date": "2/27/2026", "Contract Value": 841.12, Services: "Installation Services, Installation Materials", "Est.Start Date": "3/4/2026", "Est.End Date": "", "% Billed": 0, "Sales Lead": "Carolyn O'Toole", "Project Manager": "Carolyn O'Toole" },
  { Job: "S25769 Joseph's Gourmet Pasta", "GC Ref": "", "Contract #": "PO # 87849", Client: "Joseph's Pasta", Contact: "Joseph's Pasta", Address: "262 Primrose Street", City: "Haverhill", "Proposal Date": "5/9/2025", "Contract Value": 44321.39, Services: "Installation Services, Installation Materials", "Est.Start Date": "5/9/2025", "Est.End Date": "", "% Billed": 1, "Sales Lead": "B - Robert Chase", "Project Manager": "B - Robert Chase" },
  { Job: "S25782 Cumberland Farms Distribution Center Flexible Door Replacement", "GC Ref": "", "Contract #": "", Client: "Cumberland Farms (Customer)", Contact: "Nathan Bartlett", Address: "165 Flanders Road", City: "Westborough", "Proposal Date": "4/15/2025", "Contract Value": 5372.16, Services: "Installation Labor and Mobilization Fees, Chase AirGard 200", "Est.Start Date": "4/22/2025", "Est.End Date": "", "% Billed": 1, "Sales Lead": "B - Robert Chase", "Project Manager": "" },
  { Job: "S25783 Monogram Foods Freezer Door Heater Replacement", "GC Ref": "", "Contract #": "", Client: "Monogram Foods (Haverhill)", Contact: "Larry Goddard", Address: "51 Research Dr", City: "Haverhill", "Proposal Date": "4/15/2025", "Contract Value": 12184.27, Services: "Installation Labor, Jamison Frigo Side Frame Heaters, Replacement Black Vinyl Track", "Est.Start Date": "6/17/2025", "Est.End Date": "", "% Billed": 1, "Sales Lead": "B - Robert Chase", "Project Manager": "" },
  { Job: "S25804 Jamison Door Co Warranty Repair", "GC Ref": "", "Contract #": "", Client: "Jamison Door Company", Contact: "Whitney Hopper", Address: "1107 Northrop Road", City: "Wallingford", "Proposal Date": "8/1/2025", "Contract Value": 4864, Services: "Installation Services", "Est.Start Date": "8/1/2025", "Est.End Date": "", "% Billed": 1, "Sales Lead": "B - Robert Chase", "Project Manager": "B - Robert Chase" },
  { Job: "S25812 Superior Cake Jamison Freezer Door Repair", "GC Ref": "", "Contract #": "", Client: "Superior Cake", Contact: "Carolina Coello", Address: "94 Ashland Avenue", City: "Southbridge", "Proposal Date": "8/1/2025", "Contract Value": 19406.21, Services: "Installation Materials, Installation Services", "Est.Start Date": "8/21/2025", "Est.End Date": "", "% Billed": 1, "Sales Lead": "B - Robert Chase", "Project Manager": "B - Robert Chase" },
  { Job: "S25817 Chinese Spaghetti Factory Cooler and Freezer Door Replacement", "GC Ref": "", "Contract #": "", Client: "Chinese Spaghetti Factory", Contact: "David Sou", Address: "83 Newmarket Square", City: "Boston", "Proposal Date": "8/29/2025", "Contract Value": 23615.87, Services: "Installation Services, Installation Materials", "Est.Start Date": "9/8/2025", "Est.End Date": "", "% Billed": 1, "Sales Lead": "B - Robert Chase", "Project Manager": "B - Robert Chase" },
  { Job: "S25819 Acme Smoked Fish Cold Storage Doors Repair", "GC Ref": "", "Contract #": "", Client: "Acme Smoked Fish Corp", Contact: "Matthew Egan", Address: "76 Campanelli Industrial Drive", City: "Brockton", "Proposal Date": "8/22/2025", "Contract Value": 14441.58, Services: "Installation Materials, Installation Services", "Est.Start Date": "", "Est.End Date": "", "% Billed": 1, "Sales Lead": "B - Robert Chase", "Project Manager": "B - Robert Chase" },
  { Job: "S25825 Rainforest Distribution Jamison Freezer Door Repair", "GC Ref": "", "Contract #": "", Client: "Rainforest Distribution", Contact: "Calvin Torres", Address: "35 Eastman St.", City: "South Easton", "Proposal Date": "9/16/2025", "Contract Value": 12720.39, Services: "Installation Materials, Installation Services", "Est.Start Date": "9/16/2025", "Est.End Date": "", "% Billed": 1, "Sales Lead": "B - Robert Chase", "Project Manager": "B - Robert Chase" },
  { Job: "S25827 Bode Equipment Air Curtain Install for Sanofi", "GC Ref": "", "Contract #": "", Client: "Bode Equipment", Contact: "Scott Fawcett", Address: "51 New York Avenue", City: "Framingham", "Proposal Date": "10/1/2025", "Contract Value": 26679.53, Services: "Installation Services, Installation Materials", "Est.Start Date": "", "Est.End Date": "", "% Billed": 1, "Sales Lead": "B - Robert Chase", "Project Manager": "B - Robert Chase" },
  { Job: "S25828 Goya Door Panel Replacement", "GC Ref": "", "Contract #": "", Client: "Cold Door Services", Contact: "Cold Services", Address: "5 Goya Dr", City: "Webster", "Proposal Date": "10/20/2025", "Contract Value": 3563.75, Services: "Installation Services", "Est.Start Date": "10/21/2025", "Est.End Date": "10/21/2025", "% Billed": 1, "Sales Lead": "B - Robert Chase", "Project Manager": "B - Robert Chase" },
  { Job: "S25832 UMass Chan Medical School Gasket Replacement", "GC Ref": "", "Contract #": "", Client: "Karen Lepkowski", Contact: "Karen Lepkowski", Address: "55 North Lake Avenue", City: "Worcester", "Proposal Date": "9/3/2025", "Contract Value": 7000.63, Services: "Installation Materials, Installation Services", "Est.Start Date": "", "Est.End Date": "", "% Billed": 1, "Sales Lead": "B - Robert Chase", "Project Manager": "B - Robert Chase" },
  { Job: "S25833 Boston Baking Threshold and Trim Replacement", "GC Ref": "", "Contract #": "", Client: "Boston Baking", Contact: "Boston Baking", Address: "101 Sprague Street", City: "Hyde Park", "Proposal Date": "10/3/2025", "Contract Value": 1215.5, Services: "Installation Materials, Installation Services", "Est.Start Date": "10/29/2025", "Est.End Date": "", "% Billed": 1, "Sales Lead": "B - Robert Chase", "Project Manager": "B - Robert Chase" },
  { Job: "S25834 Siemens Stainless Steel Cooler Door Gasket Replacement", "GC Ref": "", "Contract #": "REQ#6724365", Client: "Siemens Healthineers", Contact: "Siemens Healthineers", Address: "333 Coney Street", City: "Walpole", "Proposal Date": "10/3/2025", "Contract Value": 3760.5, Services: "Installation Services, Installation Materials", "Est.Start Date": "11/17/2025", "Est.End Date": "", "% Billed": 1, "Sales Lead": "B - Robert Chase", "Project Manager": "B - Robert Chase" },
  { Job: "S25835 Richie's Slush Freezer Door Repair", "GC Ref": "", "Contract #": "", Client: "Richie's Slush", Contact: "Richie's Slush", Address: "3 Garvey St", City: "Everett", "Proposal Date": "11/26/2025", "Contract Value": 1851.49, Services: "Installation Materials, Installation Services", "Est.Start Date": "12/1/2025", "Est.End Date": "", "% Billed": 1, "Sales Lead": "B - Robert Chase", "Project Manager": "B - Robert Chase" },
  { Job: "S25838 Monogram Foods (Haverhill) Exterior Door Rework", "GC Ref": "", "Contract #": "", Client: "Monogram Foods (Haverhill)", Contact: "Larry Goddard", Address: "51 Research Drive", City: "Haverhill", "Proposal Date": "12/11/2025", "Contract Value": 3114, Services: "Installation Services, Installation Materials", "Est.Start Date": "12/15/2025", "Est.End Date": "12/15/2025", "% Billed": 1, "Sales Lead": "B - Robert Chase", "Project Manager": "B - Robert Chase" },
  { Job: "S26702 Brodeur Machine Company Custom Trim", "GC Ref": "", "Contract #": "", Client: "Brodeur Machine", Contact: "Gary Majewski", Address: "62 Wood St", City: "New Bedford", "Proposal Date": "1/8/2026", "Contract Value": 1813, Services: "Installation Materials, Installation Services", "Est.Start Date": "2/2/2026", "Est.End Date": "", "% Billed": 1, "Sales Lead": "B - Robert Chase", "Project Manager": "B - Robert Chase" },
  { Job: "S26703 Northern Wind Freezer Door Replacement (Plant 1)", "GC Ref": "", "Contract #": "", Client: "Northern Wind", Contact: "Northern Wind", Address: "16 Hassey Street", City: "New Bedford", "Proposal Date": "10/17/2025", "Contract Value": 19717.95, Services: "Installation Materials, Installation Services", "Est.Start Date": "10/17/2025", "Est.End Date": "", "% Billed": 0, "Sales Lead": "B - Robert Chase", "Project Manager": "B - Robert Chase" },
  { Job: "S26705 Replacement Freezer Man Door at Raytheon for ARC", "GC Ref": "", "Contract #": "", Client: "ARC Mechanical", Contact: "Joe Marella", Address: "350 Lowell Street", City: "Andover", "Proposal Date": "12/9/2025", "Contract Value": 14891.2, Services: "Installation Materials, Installation Services", "Est.Start Date": "1/7/2026", "Est.End Date": "", "% Billed": 0, "Sales Lead": "B - Robert Chase", "Project Manager": "B - Robert Chase" },
  { Job: "S26706 Siemens Vestibule Roll Up Door Replacement", "GC Ref": "", "Contract #": "", Client: "Siemens Healthineers", Contact: "Siemens Healthineers", Address: "333 Coney Street", City: "Walpole", "Proposal Date": "10/30/2025", "Contract Value": 28415.73, Services: "Installation Materials, Installation Services", "Est.Start Date": "2/2/2026", "Est.End Date": "", "% Billed": 0, "Sales Lead": "B - Robert Chase", "Project Manager": "B - Robert Chase" },
  { Job: "S26708 Monogram (Haverhill) Replacement Curtain for Jamison Roll Up Freezer Door", "GC Ref": "", "Contract #": "", Client: "Monogram Foods (Haverhill)", Contact: "Larry Goddard", Address: "51 Research Drive", City: "Haverhill", "Proposal Date": "10/30/2025", "Contract Value": 5687.28, Services: "Installation Services, Installation Materials", "Est.Start Date": "2/2/2026", "Est.End Date": "", "% Billed": 0, "Sales Lead": "B - Robert Chase", "Project Manager": "B - Robert Chase" },
  { Job: "S26711 Boston Salads Flap Door Replacement (4 sets) Second Phase", "GC Ref": "", "Contract #": "", Client: "Boston Salads", Contact: "", Address: "26 Chesteron Street", City: "Boston", "Proposal Date": "12/15/2025", "Contract Value": 25412.17, Services: "Installation Materials, Installation Services", "Est.Start Date": "2/11/2026", "Est.End Date": "", "% Billed": 0, "Sales Lead": "B - Robert Chase", "Project Manager": "B - Robert Chase" },
  { Job: "S26714 Bode Equipment Air Curtain Install for Sanofi (PHASE 2)", "GC Ref": "", "Contract #": "", Client: "Bode Equipment", Contact: "Scott Fawcett", Address: "68 New York Ave", City: "Framingham", "Proposal Date": "2/6/2026", "Contract Value": 31611.46, Services: "Installation Services, Installation Materials", "Est.Start Date": "", "Est.End Date": "", "% Billed": 0, "Sales Lead": "B - Robert Chase", "Project Manager": "B - Robert Chase" },
  { Job: "S26715 Rytec Cooler Door Repair for Channel Fish Processing", "GC Ref": "", "Contract #": "", Client: "Channel Fish Processing", Contact: "Jimmy", Address: "200 Commerce Dr", City: "Braintree", "Proposal Date": "1/27/2026", "Contract Value": 7941.35, Services: "Installation Materials, Installation Services", "Est.Start Date": "", "Est.End Date": "", "% Billed": 0, "Sales Lead": "B - Robert Chase", "Project Manager": "B - Robert Chase" },
  { Job: "S26720 Monogram (Haverhill) Motor Replacement for Jamison Door", "GC Ref": "", "Contract #": "", Client: "Monogram Foods (Haverhill)", Contact: "Larry Goddard", Address: "51 Research Drive", City: "Haverhill", "Proposal Date": "3/9/2026", "Contract Value": 5626.74, Services: "Installation Materials, Installation Services", "Est.Start Date": "3/9/2026", "Est.End Date": "", "% Billed": 0, "Sales Lead": "B - Robert Chase", "Project Manager": "B - Robert Chase" },
  { Job: "Top of The Hill Beef Outdoor Freezer 8'x16'", "GC Ref": "", "Contract #": "", Client: "Alan Fredrickson", Contact: "Alan Fredrickson", Address: "Martin Hill Road", City: "Wolfeboro", "Proposal Date": "1/19/2026", "Contract Value": 42023.11, Services: "Installation Materials, Floor Panel - 8', Freezer Ramp, Installation Services, Freezer Door 3' x 7'", "Est.Start Date": "3/10/2026", "Est.End Date": "", "% Billed": 0, "Sales Lead": "Joe Tavares", "Project Manager": "Joe Tavares" },
]

async function main() {
  console.log("Seeding active jobs from Knowify report...")

  // Delete old placeholder jobs
  const deleted = await prisma.job.deleteMany({
    where: { number: { startsWith: "JOB-" } },
  })
  if (deleted.count > 0) {
    console.log(`  Removed ${deleted.count} placeholder jobs`)
  }

  let created = 0
  let skipped = 0

  for (const row of jobs) {
    const { number, name } = parseJobNumber(row.Job)

    // Skip test entries
    if (row.Job.startsWith("TEST")) {
      skipped++
      continue
    }

    // Check if already exists
    if (number) {
      const existing = await prisma.job.findUnique({ where: { number } })
      if (existing) {
        // Update existing record with new data
        await prisma.job.update({
          where: { number },
          data: {
            name,
            client: row.Client?.trim() || null,
            contactName: row.Contact?.trim() || null,
            address: row.Address?.trim() || null,
            city: row.City?.trim() || null,
            contractNumber: String(row["Contract #"] || "").trim() || null,
            gcRef: row["GC Ref"]?.trim() || null,
            contractValue: row["Contract Value"] ? new Prisma.Decimal(row["Contract Value"]) : null,
            services: row.Services?.trim() || null,
            proposalDate: parseDate(row["Proposal Date"]),
            estStartDate: parseDate(row["Est.Start Date"]),
            estEndDate: parseDate(row["Est.End Date"]),
            percentBilled: row["% Billed"] != null ? new Prisma.Decimal(row["% Billed"]) : null,
            salesLead: row["Sales Lead"]?.trim() || null,
            projectManager: row["Project Manager"]?.trim() || null,
          },
        })
        console.log(`  Updated "${number} ${name}"`)
        created++
        continue
      }
    }

    await prisma.job.create({
      data: {
        name,
        number: number || undefined,
        client: row.Client?.trim() || null,
        contactName: row.Contact?.trim() || null,
        address: row.Address?.trim() || null,
        city: row.City?.trim() || null,
        contractNumber: String(row["Contract #"] || "").trim() || null,
        gcRef: row["GC Ref"]?.trim() || null,
        contractValue: row["Contract Value"] ? new Prisma.Decimal(row["Contract Value"]) : null,
        services: row.Services?.trim() || null,
        proposalDate: parseDate(row["Proposal Date"]),
        estStartDate: parseDate(row["Est.Start Date"]),
        estEndDate: parseDate(row["Est.End Date"]),
        percentBilled: row["% Billed"] != null ? new Prisma.Decimal(row["% Billed"]) : null,
        salesLead: row["Sales Lead"]?.trim() || null,
        projectManager: row["Project Manager"]?.trim() || null,
      },
    })
    created++
    console.log(`  Created "${number || ''} ${name}"`)
  }

  console.log(`\nDone! ${created} jobs seeded, ${skipped} skipped.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
