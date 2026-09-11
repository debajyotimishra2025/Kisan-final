import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

// Slot times offered per day at every procurement center.
export const SLOT_TIMES = [
  "09:00-10:00",
  "10:00-11:00",
  "11:00-12:00",
  "13:00-14:00",
  "14:00-15:00",
  "15:00-16:00",
];

function defaultData() {
  return {
    // Keep staff account
    users: [
      {
        id: "staff-1",
        name: "Procurement Staff",
        phone: "9999999999",
        passwordHash: bcrypt.hashSync("staff123", 10),
        role: "staff",
        createdAt: new Date().toISOString(),
      },
    ],

    // Keep crops
    crops: [
      {
        id: "crop-wheat",
        name: "Wheat",
        image:
          "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=600&q=80",
        price: 25,
      },
      {
        id: "crop-rice",
        name: "Rice",
        image:
          "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80",
        price: 30,
      },
      {
        id: "crop-corn",
        name: "Corn",
        image:
          "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80",
        price: 22,
      },
      {
        id: "crop-potato",
        name: "Potato",
        image:
          "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=80",
        price: 20,
      },
    ],

    // Keep procurement centers
    centers: [
      {
        id: "center-kolkata",
        name: "Kolkata",
        address: "Procurement Hub, Salt Lake, Kolkata",
        dailyCapacity: 24,
      },
      {
        id: "center-howrah",
        name: "Howrah",
        address: "Grain Market Road, Howrah",
        dailyCapacity: 18,
      },
      {
        id: "center-durgapur",
        name: "Durgapur",
        address: "Industrial Area, Durgapur",
        dailyCapacity: 18,
      },
      {
        id: "center-siliguri",
        name: "Siliguri",
        address: "NH-27, Siliguri",
        dailyCapacity: 18,
      },
      {
        id: "center-asansol",
        name: "Asansol",
        address: "GT Road, Asansol",
        dailyCapacity: 18,
      },
    ],

    // CLEAR ALL FARMER ORDERS
    orders: [],

    // CLEAR ALL BOOKED APPOINTMENTS
    appointments: [],
  };
}

function ensureDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(
      DB_PATH,
      JSON.stringify(defaultData(), null, 2)
    );
  }
}

export function readDb() {
  ensureDb();

  const raw = fs.readFileSync(DB_PATH, "utf-8");

  return JSON.parse(raw);
}

export function writeDb(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  fs.writeFileSync(
    DB_PATH,
    JSON.stringify(data, null, 2)
  );
}

// Convenience helper:
// read → mutate → save → return result
export function withDb(mutator) {
  const data = readDb();

  const result = mutator(data);

  writeDb(data);

  return result;
}