import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../api/client.js';
import { projectsApi } from '../../api/projects.js';
import { useCacheStore } from '../../stores/cacheStore.js';

/**
 * Owns the projects list for this feature (docs/02: features keep their own
 * hooks; `api/` stays React-free). status: loading | ready | error.
 *
 * Uses Zustand cache for 0ms immediate render without skeleton flicker.
 */
export function useProjects() {
  const cached = useCacheStore.getState().get('/api/v1/projects');
  const [projects, setProjects] = useState(cached || []);
  const [status, setStatus] = useState(cached ? 'ready' : 'loading');
  const [error, setError] = useState(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setStatus('loading');
    setError(null);

    try {
      const data = await projectsApi.list();
      setProjects(data);
      setStatus('ready');
    } catch (err) {
      if (!silent) {
        setError(
          err instanceof ApiError ? err.message : 'Could not load your projects.',
        );
        setStatus('error');
      }
    }
  }, []);

  useEffect(() => {
    load(Boolean(cached));
  }, [load, cached]);

  /**
   * POST /projects answers with a bare Project, but the list renders
   * { role, project: { …members } } — so fill the gaps for the creator
   * (they are always the project's first admin).
   */
  const addProject = useCallback((project) => {
    setProjects((list) => [
      {
        role: 'admin',
        project: { ...project, members: project.members ?? 1 },
      },
      ...list,
    ]);
  }, []);

  return { projects, status, error, reload: load, addProject };
}
