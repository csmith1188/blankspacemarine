/**
 * Schoology REST API helpers for teacher grade uploads and student progress reports.
 * Adapted from HeroPanel's schoologyOps.js using 2-legged OAuth 1.0a.
 */

async function listEnrollments(client, sectionId) {
    const data = await client.signedRequest(
        'GET',
        `/sections/${encodeURIComponent(sectionId)}/enrollments?limit=200`
    );
    return (data && Array.isArray(data.enrollment)) ? data.enrollment : [];
}

function findEnrollmentByUid(enrollments, uid) {
    const target = String(uid || '').trim();
    if (!target) return null;
    const match = (enrollments || []).find((e) => String(e.uid) === target);
    if (!match || Number(match.admin) === 1) return null;
    return match;
}

async function getAssignment(client, sectionId, assignmentId) {
    return client.signedRequest(
        'GET',
        `/sections/${encodeURIComponent(sectionId)}/assignments/${encodeURIComponent(assignmentId)}`
    );
}

async function resolveGradeItemId(client, sectionId, assignmentId) {
    try {
        const assignment = await getAssignment(client, sectionId, assignmentId);
        const gradeItemId = assignment && (assignment.grade_item_id || assignment.id);
        if (gradeItemId) return String(gradeItemId);
    } catch {
        // Fall back to assignmentId on dropbox assignments where grade_item_id === id
    }
    return String(assignmentId);
}

async function createStudentComment(client, sectionId, gradeItemId, htmlBody, studentUid) {
    if (!studentUid) {
        throw new Error('Schoology user ID is required to post metrics on a student assignment.');
    }
    return client.signedRequest(
        'POST',
        `/sections/${encodeURIComponent(sectionId)}/submissions/${encodeURIComponent(gradeItemId)}/${encodeURIComponent(studentUid)}/comments`,
        { comment: htmlBody }
    );
}

async function getStudentGrade(client, sectionId, assignmentId, enrollmentId) {
    const qs = `assignment_id=${encodeURIComponent(assignmentId)}&enrollment_id=${encodeURIComponent(enrollmentId)}`;
    return client.signedRequest('GET', `/sections/${encodeURIComponent(sectionId)}/grades?${qs}`);
}

async function putStudentGrade(client, sectionId, assignmentId, enrollmentId, gradeValue, comment) {
    await client.signedRequest('PUT', `/sections/${encodeURIComponent(sectionId)}/grades`, {
        grades: {
            grade: [
                {
                    type: 'assignment',
                    assignment_id: Number(assignmentId),
                    enrollment_id: Number(enrollmentId),
                    grade: gradeValue,
                    comment: comment || 'Grade from Blank Space Marine'
                }
            ]
        }
    });
    return getStudentGrade(client, sectionId, assignmentId, enrollmentId);
}

async function sendPrivateMessage(client, { recipientId, subject, message }) {
    const uid = String(recipientId || '').trim();
    if (!uid) {
        throw new Error('Schoology user ID is required to send a report.');
    }
    return client.signedRequest('POST', '/messages', {
        recipient_ids: uid,
        subject: subject || 'Blank Space Marine Progress Report',
        message: message || ''
    });
}

module.exports = {
    listEnrollments,
    findEnrollmentByUid,
    getAssignment,
    resolveGradeItemId,
    createStudentComment,
    getStudentGrade,
    putStudentGrade,
    sendPrivateMessage
};
