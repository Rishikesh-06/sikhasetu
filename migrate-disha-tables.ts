import dotenv from "dotenv";
import { query } from "./server/db";

dotenv.config();

async function migrateDisha() {
  console.log("[Migration] Applying DISHA tables to database...");

  const ddl = `
  CREATE TABLE IF NOT EXISTS disha_documents (
    id VARCHAR(64) PRIMARY KEY,
    student_id VARCHAR(36) REFERENCES student_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER DEFAULT 0,
    page_count INTEGER DEFAULT 1,
    chapter_count INTEGER DEFAULT 0,
    subject VARCHAR(100),
    class_level INTEGER,
    summary TEXT,
    key_concepts JSONB DEFAULT '[]'::jsonb,
    chapters JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(30) DEFAULT 'ready',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS disha_document_chunks (
    id VARCHAR(64) PRIMARY KEY,
    document_id VARCHAR(64) REFERENCES disha_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    page_number INTEGER DEFAULT 1,
    chapter_title VARCHAR(255),
    content TEXT NOT NULL,
    keywords JSONB DEFAULT '[]'::jsonb,
    embedding JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS disha_conversations (
    id VARCHAR(64) PRIMARY KEY,
    student_id VARCHAR(36) REFERENCES student_profiles(id) ON DELETE CASCADE,
    document_id VARCHAR(64) REFERENCES disha_documents(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'Chat with Disha',
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS disha_messages (
    id VARCHAR(64) PRIMARY KEY,
    conversation_id VARCHAR(64) REFERENCES disha_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    audio_url TEXT,
    sources JSONB DEFAULT '[]'::jsonb,
    is_grounded BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS disha_quizzes (
    id VARCHAR(64) PRIMARY KEY,
    document_id VARCHAR(64) REFERENCES disha_documents(id) ON DELETE CASCADE,
    student_id VARCHAR(36) REFERENCES student_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
  `;

  try {
    await query(ddl);
    console.log("[Migration] DISHA tables successfully created in Supabase PostgreSQL!");
    process.exit(0);
  } catch (err: any) {
    console.error("[Migration Error]", err);
    process.exit(1);
  }
}

migrateDisha();
