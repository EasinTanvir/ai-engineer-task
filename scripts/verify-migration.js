import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const documents = await pool.query(`
    select source_file, count(*)::int as chunks, min(source_type) as source_type,
      min(version_status) as version_status, min(authority_rank)::int as authority_rank,
      min(account_scope) as account_scope
    from document_chunks
    group by source_file
    order by source_file
  `);
  const northstar = await pool.query(`
    select distinct account_scope
    from document_chunks
    where source_file = '05_Northstar_Logistics_Enterprise_Agreement.pdf'
  `);
  const deprecated = await pool.query(`
    select distinct authority_rank
    from document_chunks
    where source_file = '02_Support_Policy_v2_DEPRECATED.pdf'
  `);
  console.log(
    JSON.stringify(
      {
        documents: documents.rows,
        northstar: northstar.rows,
        deprecated: deprecated.rows,
      },
      null,
      2,
    ),
  );
} finally {
  await pool.end();
}
