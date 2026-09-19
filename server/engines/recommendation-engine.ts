import { query } from "../db";

export class RecommendationEngine {
  /**
   * Generates dynamic "For You" personalized practice items based on lowest mastered skills in PostgreSQL
   */
  public static async getPersonalizedPractice(studentId: string) {
    // 1. Fetch practice activities already in database
    const practiceRes = await query(
      `SELECT * FROM practice_activities WHERE student_id = $1 ORDER BY completed_at DESC, progress ASC`,
      [studentId]
    );

    if (practiceRes.rows.length > 0) {
      return practiceRes.rows.map(p => ({
        id: p.id,
        title: p.title,
        subject: p.subject,
        topic: p.topic,
        skill: p.skill,
        minutes: p.minutes,
        level: p.level,
        progress: p.progress
      }));
    }

    // 2. If none, generate from lowest scoring learning evidence in database
    const evidenceRes = await query(
      `SELECT * FROM learning_evidence WHERE student_id = $1 ORDER BY mastery_score ASC LIMIT 3`,
      [studentId]
    );

    const recommendations: any[] = [];
    for (let i = 0; i < evidenceRes.rows.length; i++) {
      const ev = evidenceRes.rows[i];
      const pId = `prac-${studentId}-${i + 1}`;
      const title = `5-Minute ${ev.skill} Boost`;
      const level = ev.mastery_score < 50 ? "Foundation" : ev.mastery_score < 70 ? "Build" : "Challenge";
      const minutes = ev.mastery_score < 50 ? 5 : 7;

      await query(
        `INSERT INTO practice_activities (id, student_id, title, subject, topic, skill, minutes, level, progress)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [pId, studentId, title, ev.subject, ev.topic, ev.skill, minutes, level, 0]
      );

      recommendations.push({
        id: pId,
        title,
        subject: ev.subject,
        topic: ev.topic,
        skill: ev.skill,
        minutes,
        level,
        progress: 0
      });
    }

    return recommendations;
  }

  public static async getPersonalizedRecommendations(studentId: string) {
    return this.getPersonalizedPractice(studentId);
  }
}
