import sqldb from "../config/sqldatabase.js";

export async function getRoutes() {
    const [rows] = await sqldb.query("SELECT id, r_title FROM routes");
    return rows;
}