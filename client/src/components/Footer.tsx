import React from 'react';
import { useAppStore } from '../store/useApp';

export const Footer: React.FC = () => {
  const { setScreen } = useAppStore();

  const scrollToAffiliates = () => {
    setScreen('lobby');
    // Small delay to ensure lobby is rendered
    setTimeout(() => {
      const affiliateTab = document.querySelector('[data-tab="affiliates"]') as HTMLElement;
      if (affiliateTab) {
        affiliateTab.click();
        setTimeout(() => {
          window.scrollTo({ top: 300, behavior: 'smooth' });
        }, 100);
      }
    }, 100);
  };

  return (
    <footer style={{
      marginTop: '80px',
      padding: '48px 24px 24px',
      background: 'linear-gradient(180deg, transparent 0%, rgba(30, 58, 138, 0.3) 100%)',
      borderTop: '1px solid rgba(65, 105, 225, 0.2)'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Security Badges */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '32px',
          marginBottom: '32px',
          flexWrap: 'wrap'
        }}>
          {/* Norton Secured */}
          <div style={{ opacity: 0.9 }}>
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="127px" height="39px" viewBox="0 0 254 78">
              <path fillRule="evenodd" clipRule="evenodd" fill="#FDB714" d="M5.853,2h242.719c2.916,0,5.279,2.363,5.279,5.279v39.268l-5.279-0.119H5.853l-5.279,0.119V7.279C0.574,4.363,2.937,2,5.853,2z"/>
              <path fillRule="evenodd" clipRule="evenodd" fill="#FFFFFF" d="M5.853,78h242.719c2.916,0,5.279-2.363,5.279-5.279V46.325l-5.279,0.119H5.853l-5.279-0.119v26.396C0.574,75.637,2.937,78,5.853,78z"/>
              <path fillRule="evenodd" clipRule="evenodd" fill="#FFFFFF" d="M23.069,13.25c8.021,0,14.523,6.502,14.523,14.524c0,8.022-6.502,14.524-14.523,14.524c-8.022,0-14.524-6.502-14.524-14.524C8.545,19.752,15.047,13.25,23.069,13.25z"/>
              <text x="50" y="32" fill="#FFFFFF" fontSize="18" fontWeight="bold">Norton Secured</text>
            </svg>
          </div>

          {/* SSL Secured */}
          <div style={{ opacity: 0.9 }}>
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="127px" height="39px" viewBox="0 0 254 78">
              <path fillRule="evenodd" clipRule="evenodd" fill="#25B34B" d="M5.853,2h242.719c2.916,0,5.279,2.363,5.279,5.279v39.268l-5.279-0.119H5.853l-5.279,0.119V7.279C0.574,4.363,2.937,2,5.853,2z"/>
              <path fillRule="evenodd" clipRule="evenodd" fill="#FFFFFF" d="M5.853,78h242.719c2.916,0,5.279-2.363,5.279-5.279V46.325l-5.279,0.119H5.853l-5.279-0.119v26.396C0.574,75.637,2.937,78,5.853,78z"/>
              <path fillRule="evenodd" clipRule="evenodd" fill="#FFFFFF" d="M23.069,13.25c8.021,0,14.523,6.502,14.523,14.524c0,8.022-6.502,14.524-14.523,14.524c-8.022,0-14.524-6.502-14.524-14.524C8.545,19.752,15.047,13.25,23.069,13.25z"/>
              <text x="50" y="32" fill="#FFFFFF" fontSize="16" fontWeight="bold">Sigilo Absoluto</text>
            </svg>
          </div>

          {/* GeoTrust */}
          <div style={{ opacity: 0.9 }}>
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="127px" height="39px" viewBox="0 0 254 78">
              <path fill="#114C8F" d="M5.853,2h242.719c2.916,0,5.279,2.363,5.279,5.279v39.268l-5.279-0.119H5.853l-5.279,0.119V7.279C0.574,4.363,2.937,2,5.853,2z"/>
              <path fill="#FFFFFF" d="M5.853,78h242.719c2.916,0,5.279-2.363,5.279-5.279V46.325l-5.279,0.118H5.853l-5.279-0.118v26.396C0.574,75.637,2.937,78,5.853,78z"/>
              <path fillRule="evenodd" clipRule="evenodd" fill="#FFFFFF" d="M23.069,13.25c8.021,0,14.523,6.502,14.523,14.524c0,8.022-6.502,14.524-14.523,14.524c-8.022,0-14.524-6.502-14.524-14.524C8.545,19.752,15.047,13.25,23.069,13.25z"/>
              <text x="50" y="32" fill="#FFFFFF" fontSize="20" fontWeight="bold">GeoTrust</text>
            </svg>
          </div>
        </div>

        {/* Age Restriction */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '32px',
          padding: '16px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '2px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '8px',
          maxWidth: '600px',
          margin: '0 auto 32px'
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2"/>
            <path d="M12 8V12M12 16H12.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <div>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#ef4444' }}>
              PROIBIDO PARA MENORES DE 18 ANOS
            </p>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              Esta plataforma é restrita a maiores de idade
            </p>
          </div>
        </div>

        {/* Links */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '32px',
          marginBottom: '32px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setScreen('privacy')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-secondary)',
              fontSize: '14px',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '4px 8px'
            }}
          >
            Termos de Serviço
          </button>
          <button
            onClick={() => setScreen('privacy')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-secondary)',
              fontSize: '14px',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '4px 8px'
            }}
          >
            Política de Privacidade
          </button>
          <button
            onClick={() => setScreen('privacy')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-secondary)',
              fontSize: '14px',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '4px 8px'
            }}
          >
            Política de Cookies
          </button>
          <button
            onClick={scrollToAffiliates}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-secondary)',
              fontSize: '14px',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '4px 8px'
            }}
          >
            Área de Afiliados
          </button>
        </div>

        {/* Copyright */}
        <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
          <p style={{ margin: 0 }}>Drift Cash® 2025 ©</p>
          <p style={{ margin: '8px 0 0', fontSize: '12px', opacity: 0.7 }}>
            Todos os direitos reservados
          </p>
        </div>
      </div>
    </footer>
  );
};
