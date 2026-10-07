import pg from "pg";

const client = new pg.Client({
  host: "db.ewejfqnnylaszprfpjyd.supabase.co",
  port: 5432,
  user: "postgres",
  password: process.env.SUPABASE_SERVICE_ROLE_KEY,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

client.connect((err) => {
  if (err) {
    console.log("pg connect error:", err.message);
  } else {
    console.log("pg connect SUCCESS!");
    client.end();
  }
});
