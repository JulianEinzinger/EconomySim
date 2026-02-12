import oracledb, { type Connection } from "oracledb";
const { getConnection } = oracledb;

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

export async function getDBConnection(): Promise<Connection> {
    return await getConnection({
        user: "if230168",
        password: "oracle",
        connectString: "zeus.htl-leonding.ac.at:1521/leopdb"
    });
}