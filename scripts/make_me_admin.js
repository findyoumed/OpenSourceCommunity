// [LOG: 20260526_1903]
// Supabase PostgreSQL 원격 승급 수술 스크립트
const { Client } = require('pg');

const connectionString = "postgresql://postgres.fhmrxmpyynrkldtydjjf:F1XDdy0D55rnIpzI@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";

async function run() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false } // Supabase 클라우드 보안 연결 필수 옵션
  });

  try {
    console.log("Connecting to Supabase Database...");
    await client.connect();
    console.log("Connected successfully!");

    // 1. 현재 가입된 사용자 이메일 목록 파악
    console.log("\n--- [데이터베이스 가입 회원 정보] ---");
    const usersRes = await client.query("SELECT id, email, display_name FROM users;");
    console.table(usersRes.rows);

    // 2. 현재 멤버 권한 상태 파악
    console.log("\n--- [현재 부여된 직급 목록] ---");
    const membersRes = await client.query("SELECT id, user_id, role, display_name FROM members;");
    console.table(membersRes.rows);

    // 3. 모든 멤버를 최고 관리자(org_admin)로 전원 승격!
    console.log("\nUpgrading all users to 최고 존엄 관리자 (org_admin)...");
    const updateRes = await client.query("UPDATE members SET role = 'org_admin' WHERE role != 'org_admin';");
    console.log(`Successfully upgraded ${updateRes.rowCount} user(s) to 'org_admin'!`);

    // 4. 업데이트된 상태 최종 검증 출력
    console.log("\n--- [업데이트 완료된 직급 목록] ---");
    const membersUpdatedRes = await client.query("SELECT id, user_id, role, display_name FROM members;");
    console.table(membersUpdatedRes.rows);

  } catch (err) {
    console.error("Database surgery failed:", err);
  } finally {
    await client.end();
    console.log("Connection closed.");
  }
}

run();
