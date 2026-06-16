import { describe, it, expect } from 'vitest';
import { createMemoryRepositories } from '../../lib/repositories/memory';
import {
  createParticipant,
  updateParticipant,
  buildParticipantKey,
} from '../../lib/services/participantService';

describe('participantService', () => {
  it('creates a participant', async () => {
    const repos = createMemoryRepositories();
    const participant = await createParticipant(repos, {
      studyId: 'STUDY-1',
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@example.com',
    });

    expect(participant.first_name).toBe('Alice');
    expect(participant.study_id).toBe('STUDY-1');
    expect(participant.participant_key).toBe(buildParticipantKey('STUDY-1', 'alice@example.com'));
    expect(participant.status).toBe('active');
  });

  it('throws when creating duplicate participant', async () => {
    const repos = createMemoryRepositories();
    await createParticipant(repos, {
      studyId: 'STUDY-1',
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@example.com',
    });

    await expect(
      createParticipant(repos, {
        studyId: 'STUDY-1',
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
      })
    ).rejects.toThrow('Participant already exists');
  });

  it('updates a participant and logs audit', async () => {
    const repos = createMemoryRepositories();
    const participant = await createParticipant(repos, {
      studyId: 'STUDY-1',
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@example.com',
    });

    const updated = await updateParticipant(repos, participant.id, {
      firstName: 'Alicia',
      status: 'paused',
    });

    expect(updated.first_name).toBe('Alicia');
    expect(updated.status).toBe('paused');
  });
});
