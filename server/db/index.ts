import { Pool, type QueryResult } from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

class MemoryPostgresDb {
  private tables: Map<string, Array<Record<string, any>>> = new Map();

  constructor() {
    this.initTables();
  }

  private initTables() {
    const tableNames = [
      "schools", "classrooms", "class_enrollments", "teacher_classrooms",
      "users", "student_profiles", "teacher_profiles", "parent_profiles",
      "competition_connections", "competition_matches", "competition_activity",
      "questions", "diagnostic_attempts", "diagnostic_responses", "diagnostic_results",
      "adaptive_assessments", "assessment_assignments", "assessment_attempts",
      "assessment_responses", "learning_evidence", "subject_progress",
      "practice_activities", "quizzes", "quiz_attempts", "student_streaks",
      "student_achievements", "activity_logs", "ai_tutor_conversations", "ai_tutor_messages",
      "disha_documents", "disha_document_chunks", "disha_conversations", "disha_messages", "disha_quizzes"
    ];
    for (const name of tableNames) {
      if (!this.tables.has(name)) {
        this.tables.set(name, []);
      }
    }
  }

  public clear() {
    this.initTables();
    for (const key of this.tables.keys()) {
      this.tables.set(key, []);
    }
  }

  public getTable(name: string): Array<Record<string, any>> {
    const lower = name.toLowerCase().replace(/["']/g, "").trim();
    if (!this.tables.has(lower)) {
      this.tables.set(lower, []);
    }
    return this.tables.get(lower)!;
  }

  public query(text: string, params: any[] = []): QueryResult<any> {
    const trimmed = text.trim();
    const cleanText = trimmed.replace(/\s+/g, " ");

    // Handle transaction & schema commands (noop)
    if (
      cleanText.toUpperCase().startsWith("CREATE") ||
      cleanText.toUpperCase().startsWith("ALTER") ||
      cleanText.toUpperCase().startsWith("DROP") ||
      cleanText.toUpperCase() === "BEGIN" ||
      cleanText.toUpperCase() === "COMMIT" ||
      cleanText.toUpperCase() === "ROLLBACK"
    ) {
      return { rows: [], rowCount: 0, command: "SCHEMA", oid: 0, fields: [] };
    }

    // INSERT INTO <table> (<cols>) VALUES ($1, $2, ...)
    const insertMatch = cleanText.match(/INSERT INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
    if (insertMatch) {
      const tableName = insertMatch[1].toLowerCase();
      const columns = insertMatch[2].split(",").map(c => c.trim().replace(/["'`]/g, ""));
      const table = this.getTable(tableName);

      const newRow: Record<string, any> = {};
      columns.forEach((col, idx) => {
        let val = params[idx];
        if (typeof val === "string" && (val.startsWith("{") || val.startsWith("["))) {
          try {
            val = JSON.parse(val);
          } catch {
            // keep as string
          }
        }
        newRow[col] = val;
      });

      // Handle conflict / replace if id exists
      const existingIdx = newRow.id ? table.findIndex(r => r.id === newRow.id) : -1;
      if (existingIdx >= 0) {
        table[existingIdx] = { ...table[existingIdx], ...newRow };
      } else {
        table.push(newRow);
      }

      return { rows: [JSON.parse(JSON.stringify(newRow))], rowCount: 1, command: "INSERT", oid: 0, fields: [] };
    }

    // UPDATE <table> [alias] SET <assignments> [WHERE <where>]
    const updateMatch = cleanText.match(/UPDATE\s+([a-zA-Z0-9_]+)(?:\s+[a-zA-Z0-9_]+)?\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i);
    if (updateMatch) {
      const tableName = updateMatch[1].toLowerCase();
      const setClause = updateMatch[2];
      const whereClause = updateMatch[3];
      const table = this.getTable(tableName);

      let updatedCount = 0;
      const updatedRows: any[] = [];

      for (let i = 0; i < table.length; i++) {
        const row = table[i];
        const matches = whereClause ? this.evaluateCondition(row, whereClause, params) : true;

        if (matches) {
          // Parse assignments (e.g. col = $1, col2 = COALESCE($2, col2), xp = xp + 50)
          const assignments = setClause.split(/,(?![^(]*\))/);
          for (const assignment of assignments) {
            const eqIdx = assignment.indexOf("=");
            if (eqIdx === -1) continue;
            const rawCol = assignment.slice(0, eqIdx).trim().replace(/^[a-zA-Z0-9_]+\./, "");
            const rawExpr = assignment.slice(eqIdx + 1).trim();

            if (rawExpr.toUpperCase().startsWith("COALESCE")) {
              const inside = rawExpr.slice(rawExpr.indexOf("(") + 1, rawExpr.lastIndexOf(")")).split(",");
              const pStr = inside[0].trim();
              const pVal = this.resolveValue(pStr, params, row);
              if (pVal !== undefined && pVal !== null) {
                row[rawCol] = pVal;
              }
            } else if (rawExpr.includes("+") || rawExpr.includes("-")) {
              // Arithmetic e.g. xp = xp + 50 or xp = xp + $1
              const plusIdx = rawExpr.indexOf("+");
              const minusIdx = rawExpr.indexOf("-");
              const op = plusIdx !== -1 ? "+" : "-";
              const opIdx = plusIdx !== -1 ? plusIdx : minusIdx;
              const left = this.resolveValue(rawExpr.slice(0, opIdx).trim(), params, row);
              const right = this.resolveValue(rawExpr.slice(opIdx + 1).trim(), params, row);
              const numLeft = Number(left) || 0;
              const numRight = Number(right) || 0;
              row[rawCol] = op === "+" ? numLeft + numRight : numLeft - numRight;
            } else {
              row[rawCol] = this.resolveValue(rawExpr, params, row);
            }
          }
          row["updated_at"] = new Date().toISOString();
          updatedCount++;
          updatedRows.push(JSON.parse(JSON.stringify(row)));
        }
      }

      return { rows: updatedRows, rowCount: updatedCount, command: "UPDATE", oid: 0, fields: [] };
    }

    // DELETE FROM <table> WHERE ...
    const deleteMatch = cleanText.match(/DELETE FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+))?$/i);
    if (deleteMatch) {
      const tableName = deleteMatch[1].toLowerCase();
      const whereClause = deleteMatch[2];
      const table = this.getTable(tableName);
      let deletedCount = 0;

      for (let i = table.length - 1; i >= 0; i--) {
        const row = table[i];
        const matches = whereClause ? this.evaluateCondition(row, whereClause, params) : true;
        if (matches) {
          table.splice(i, 1);
          deletedCount++;
        }
      }

      return { rows: [], rowCount: deletedCount, command: "DELETE", oid: 0, fields: [] };
    }

    // SELECT statement parser supporting JOIN, LEFT JOIN, WHERE, ORDER BY, LIMIT, and Aggregations
    if (cleanText.toUpperCase().startsWith("SELECT")) {
      const fromIdx = cleanText.search(/\s+FROM\s+/i);
      if (fromIdx !== -1) {
        const fields = cleanText.slice(6, fromIdx).trim();
        let remainder = cleanText.slice(fromIdx + 5).trim();

        // Extract LIMIT if present at the end
        let limitVal: number | undefined;
        const limitMatch = remainder.match(/\s+LIMIT\s+(\d+|\$[0-9]+)$/i);
        if (limitMatch) {
          const lStr = limitMatch[1];
          remainder = remainder.slice(0, limitMatch.index).trim();
          if (lStr.startsWith("$")) {
            const pIdx = parseInt(lStr.slice(1), 10) - 1;
            limitVal = params[pIdx];
          } else {
            limitVal = parseInt(lStr, 10);
          }
        }

        // Extract ORDER BY if present at the end
        let orderClause: string | undefined;
        const orderMatch = remainder.match(/\s+ORDER BY\s+(.+)$/i);
        if (orderMatch) {
          orderClause = orderMatch[1].trim();
          remainder = remainder.slice(0, orderMatch.index).trim();
        }

        // Extract WHERE if present
        let whereClause: string | undefined;
        const whereMatch = remainder.match(/\s+WHERE\s+(.+)$/i);
        if (whereMatch) {
          whereClause = whereMatch[1].trim();
          remainder = remainder.slice(0, whereMatch.index).trim();
        }

        // Parse Table & JOIN clauses
        const joinTokens = remainder.split(/\s+(LEFT\s+JOIN|INNER\s+JOIN|JOIN)\s+/i);
        const baseParts = joinTokens[0].trim().split(/\s+/);
        const baseTableName = baseParts[0].toLowerCase();
        const baseTableAlias = (baseParts[1] === "as" || baseParts[1] === "AS" ? baseParts[2] : baseParts[1]) || baseTableName;

        const baseTable = this.getTable(baseTableName);
        let joinedRows: Array<Record<string, any>> = baseTable.map(row => {
          const joined: Record<string, any> = { ...row };
          for (const [k, v] of Object.entries(row)) {
            joined[`${baseTableAlias}.${k}`] = v;
            joined[`${baseTableName}.${k}`] = v;
          }
          return joined;
        });

        for (let i = 1; i < joinTokens.length; i += 2) {
          const joinType = joinTokens[i].toUpperCase().trim();
          const joinTarget = joinTokens[i + 1].trim();
          const onParts = joinTarget.split(/\s+ON\s+/i);
          const targetTableParts = onParts[0].trim().split(/\s+/);
          const targetTableName = targetTableParts[0].toLowerCase();
          const targetTableAlias = (targetTableParts[1] === "as" || targetTableParts[1] === "AS" ? targetTableParts[2] : targetTableParts[1]) || targetTableName;
          const onCondition = onParts[1] ? onParts[1].trim() : "";

          const targetTable = this.getTable(targetTableName);
          const nextJoinedRows: Array<Record<string, any>> = [];

          for (const leftRow of joinedRows) {
            let matched = false;
            for (const rightRow of targetTable) {
              const combined: Record<string, any> = { ...leftRow, ...rightRow };
              for (const [k, v] of Object.entries(rightRow)) {
                combined[`${targetTableAlias}.${k}`] = v;
                combined[`${targetTableName}.${k}`] = v;
              }

              let onMatches = true;
              if (onCondition) {
                onMatches = this.evaluateCondition(combined, onCondition, params);
              }

              if (onMatches) {
                matched = true;
                nextJoinedRows.push(combined);
              }
            }

            if (!matched && joinType.includes("LEFT")) {
              const nullRow: Record<string, any> = { ...leftRow };
              nextJoinedRows.push(nullRow);
            }
          }

          joinedRows = nextJoinedRows;
        }

        // Apply WHERE filtering
        let results = joinedRows.filter(row => whereClause ? this.evaluateCondition(row, whereClause, params) : true);

        // Handle COUNT aggregation
        if (/COUNT\s*\(/i.test(fields)) {
          const countAliasMatch = fields.match(/COUNT\s*\([^)]*\)(?:\s+AS\s+([a-zA-Z0-9_]+))?/i);
          const alias = countAliasMatch && countAliasMatch[1] ? countAliasMatch[1] : "cnt";
          return {
            rows: [{ [alias]: results.length, cnt: results.length, count: results.length }],
            rowCount: 1,
            command: "SELECT",
            oid: 0,
            fields: []
          };
        }

        // Apply ORDER BY
        if (orderClause) {
          const [rawOrderCol, orderDir] = orderClause.trim().split(/\s+/);
          const isDesc = orderDir && orderDir.toUpperCase() === "DESC";
          results.sort((a, b) => {
            let valA = a[rawOrderCol];
            if (valA === undefined) valA = a[rawOrderCol.replace(/^[a-zA-Z0-9_]+\./, "")];
            let valB = b[rawOrderCol];
            if (valB === undefined) valB = b[rawOrderCol.replace(/^[a-zA-Z0-9_]+\./, "")];

            if (valA === undefined && valB === undefined) return 0;
            if (valA === undefined) return 1;
            if (valB === undefined) return -1;
            if (valA < valB) return isDesc ? 1 : -1;
            if (valA > valB) return isDesc ? -1 : 1;
            return 0;
          });
        }

        // Apply LIMIT
        if (limitVal !== undefined && !isNaN(limitVal)) {
          results = results.slice(0, limitVal);
        }

        // Apply Projections
        if (fields !== "*") {
          const fieldItems = fields.split(",").map(f => {
            const parts = f.trim().split(/\s+AS\s+/i);
            const rawSrc = parts[0].trim();
            const alias = (parts[1] || parts[0]).trim().replace(/^[a-zA-Z0-9_]+\./, "");
            return { rawSrc, alias };
          });

          results = results.map(row => {
            const projected: Record<string, any> = {};
            fieldItems.forEach(item => {
              if (item.rawSrc === "*" || item.rawSrc.endsWith(".*")) {
                const tablePrefix = item.rawSrc.includes(".") ? item.rawSrc.split(".")[0] : null;
                for (const [k, v] of Object.entries(row)) {
                  if (!k.includes(".")) {
                    projected[k] = v;
                  } else if (tablePrefix && k.startsWith(`${tablePrefix}.`)) {
                    const colName = k.slice(tablePrefix.length + 1);
                    projected[colName] = v;
                  }
                }
              } else {
                let val = row[item.rawSrc];
                if (val === undefined) {
                  val = row[item.rawSrc.replace(/^[a-zA-Z0-9_]+\./, "")];
                }
                projected[item.alias] = val;
              }
            });
            return projected;
          });
        }

        const cloned = JSON.parse(JSON.stringify(results));
        return { rows: cloned, rowCount: cloned.length, command: "SELECT", oid: 0, fields: [] };
      }
    }

    return { rows: [], rowCount: 0, command: "UNKNOWN", oid: 0, fields: [] };
  }

  private resolveValue(expr: string, params: any[], row?: Record<string, any>): any {
    const trimmed = expr.trim();
    if (trimmed.startsWith("$")) {
      const pIdx = parseInt(trimmed.slice(1), 10) - 1;
      let val = params[pIdx];
      if (typeof val === "string" && (val.startsWith("{") || val.startsWith("["))) {
        try { val = JSON.parse(val); } catch { /* ignore */ }
      }
      return val;
    }
    if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
      return trimmed.slice(1, -1);
    }
    if (trimmed.toLowerCase() === "true") return true;
    if (trimmed.toLowerCase() === "false") return false;
    if (trimmed.toLowerCase() === "null") return null;
    if (!isNaN(Number(trimmed)) && trimmed !== "") return Number(trimmed);

    // Look up in row: check qualified name first (e.g. "sp.user_id"), then unqualified
    if (row) {
      if (trimmed in row) {
        return row[trimmed];
      }
      const colName = trimmed.replace(/^[a-zA-Z0-9_]+\./, "");
      if (colName in row) {
        return row[colName];
      }
    }
    return trimmed;
  }

  private evaluateCondition(row: Record<string, any>, whereClause: string, params: any[]): boolean {
    // Check OR expressions first
    const orClauses = whereClause.split(/\s+OR\s+/i);
    if (orClauses.length > 1) {
      return orClauses.some(subClause => this.evaluateAndCondition(row, subClause, params));
    }
    return this.evaluateAndCondition(row, whereClause, params);
  }

  private evaluateAndCondition(row: Record<string, any>, clause: string, params: any[]): boolean {
    const conditions = clause.split(/\s+AND\s+/i);
    for (const cond of conditions) {
      const trimmed = cond.trim();
      if (!trimmed) continue;

      // Match: col operator value e.g. u.id = sp.user_id or difficulty IN ('EASY', 'MEDIUM')
      const match = trimmed.match(/([a-zA-Z0-9_.]+)\s*(=|!=|<>|>|<|>=|<=|IN|NOT IN|ILIKE|LIKE)\s*(.+)/i);
      if (!match) continue;

      const rawCol = match[1].trim();
      let rowVal = row[rawCol];
      if (rowVal === undefined) {
        const col = rawCol.replace(/^[a-zA-Z0-9_]+\./, "");
        rowVal = row[col];
      }

      const op = match[2].toUpperCase();
      const rawTarget = match[3].trim();

      if (op === "IN" || op === "NOT IN") {
        let list: any[] = [];
        if (rawTarget.startsWith("(") && rawTarget.endsWith(")")) {
          list = rawTarget.slice(1, -1).split(",").map(item => this.resolveValue(item, params, row));
        } else if (rawTarget.startsWith("$")) {
          const val = this.resolveValue(rawTarget, params, row);
          list = Array.isArray(val) ? val : [val];
        }
        const includes = list.some(item => String(item).toLowerCase() === String(rowVal).toLowerCase());
        if (op === "IN" && !includes) return false;
        if (op === "NOT IN" && includes) return false;
        continue;
      }

      const targetVal = this.resolveValue(rawTarget, params, row);

      if (op === "=") {
        if (String(rowVal).toLowerCase() !== String(targetVal).toLowerCase()) return false;
      } else if (op === "!=" || op === "<>") {
        if (String(rowVal).toLowerCase() === String(targetVal).toLowerCase()) return false;
      } else if (op === ">") {
        if (!(Number(rowVal) > Number(targetVal))) return false;
      } else if (op === "<") {
        if (!(Number(rowVal) < Number(targetVal))) return false;
      } else if (op === ">=") {
        if (!(Number(rowVal) >= Number(targetVal))) return false;
      } else if (op === "<=") {
        if (!(Number(rowVal) <= Number(targetVal))) return false;
      } else if (op === "LIKE" || op === "ILIKE") {
        const regex = new RegExp(String(targetVal).replace(/%/g, ".*"), "i");
        if (!regex.test(String(rowVal || ""))) return false;
      }
    }
    return true;
  }
}

let pool: Pool | null = null;
let memoryDb: MemoryPostgresDb | null = null;

export function getDb() {
  const currentConn = process.env.DATABASE_URL || connectionString;

  if (!currentConn) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DATABASE_URL is not configured in production environment.");
    }
    if (!memoryDb) memoryDb = new MemoryPostgresDb();
    return {
      query: async (text: string, params?: any[]) => memoryDb!.query(text, params),
      isMemory: true,
      getRawDb: () => memoryDb
    };
  }

  if (!pool) {
    const isSupabase = currentConn.includes("supabase.com") || currentConn.includes("pooler.supabase");
    pool = new Pool({
      connectionString: currentConn,
      ssl: isSupabase || process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000
    });

    pool.on("error", (err) => {
      console.error("[PostgreSQL Pool Error]:", err.message);
    });
  }

  return {
    query: async (text: string, params?: any[]) => {
      return pool!.query(text, params);
    },
    isMemory: false,
    getRawDb: () => pool
  };
}

export async function query(text: string, params?: any[]): Promise<QueryResult<any>> {
  const db = getDb();
  return db.query(text, params);
}

export async function getDatabaseHealth(): Promise<{
  status: "healthy" | "unhealthy";
  database: string;
  connectedDatabase?: string;
  currentUser?: string;
  version?: string;
  serverAddress?: string;
  isCloudSupabase: boolean;
  error?: string;
}> {
  try {
    const res = await query("SELECT current_database(), current_user, version(), inet_server_addr()");
    const row = res.rows[0] || {};
    const isSupabase = Boolean(
      process.env.DATABASE_URL?.includes("supabase.com") ||
      process.env.DATABASE_URL?.includes("pooler.supabase")
    );

    return {
      status: "healthy",
      database: isSupabase ? "supabase-postgres" : "postgresql",
      connectedDatabase: row.current_database,
      currentUser: row.current_user,
      version: row.version,
      serverAddress: row.inet_server_addr ? String(row.inet_server_addr) : undefined,
      isCloudSupabase: isSupabase
    };
  } catch (err: any) {
    return {
      status: "unhealthy",
      database: "unknown",
      isCloudSupabase: Boolean(process.env.DATABASE_URL?.includes("supabase.com")),
      error: err.message
    };
  }
}

export async function initDatabase(): Promise<void> {
  console.log("[Database] Initializing schema from schema.sql...");
  const schemaPath = path.join(process.cwd(), "server", "db", "schema.sql");
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, "utf-8");
    try {
      await query(schemaSql);
      console.log("[Database] Schema successfully initialized.");
    } catch (err: any) {
      console.error("[Database] Error running schema.sql:", err.message);
      throw err;
    }
  }
}

export async function resetDatabase(): Promise<void> {
  if (memoryDb) {
    memoryDb.clear();
  }
  await initDatabase();
}
