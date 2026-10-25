import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { scrollToId } from './useReveal';

/** Jump to a home-page section, navigating back to the home page first when needed. */
export function useSectionNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const onHome = pathname === '/';

  const goToSection = useCallback(
    (id: string) => {
      if (onHome) scrollToId(id);
      else navigate(`/#${id}`);
    },
    [onHome, navigate],
  );

  /** Open the booking flow with a specific session preselected. */
  const bookService = useCallback(
    (serviceId: string) => navigate('/#booking', { state: { bookServiceId: serviceId } }),
    [navigate],
  );

  return { onHome, goToSection, bookService, navigate };
}
