import { useNavigate } from '@remix-run/react';
import { useEffect } from 'react';

export default () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/match/CFM2220IND');
  }, [navigate]);
};
