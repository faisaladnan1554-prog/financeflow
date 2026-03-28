import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Organization, OrgSettings, OrgMember } from '../types';
import { orgApi, orgSettingsApi } from '../lib/api';
import { useAuth } from './AuthContext';

interface OrgContextType {
  org: Organization | null;
  orgSettings: OrgSettings | null;
  members: OrgMember[];
  orgRole: string;
  loading: boolean;
  updateSettings: (s: Partial<OrgSettings>) => Promise<void>;
  refreshOrg: () => Promise<void>;
  applyTheme: (settings: OrgSettings) => void;
}

const OrgContext = createContext<OrgContextType | null>(null);

// Apply CSS variables for white-label theming
function applyOrgTheme(settings: OrgSettings) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', settings.primaryColor);
  root.style.setProperty('--color-secondary', settings.secondaryColor);
  root.style.setProperty('--color-accent', settings.accentColor);

  // Dark mode
  if (settings.mode === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  // Update page title with custom app name
  if (settings.appName) {
    document.title = settings.appName;
  }
}

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [orgSettings, setOrgSettings] = useState<OrgSettings | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [orgRole, setOrgRole] = useState('owner');
  const [loading, setLoading] = useState(true);

  const refreshOrg = useCallback(async () => {
    if (!user) return;
    try {
      // Use data from auth/me response if available
      if (user.organization) {
        setOrg(user.organization);
      }
      if (user.orgSettings) {
        setOrgSettings(user.orgSettings);
        applyOrgTheme(user.orgSettings);
      }
      if (user.orgRole) {
        setOrgRole(user.orgRole);
      }
      // Also fetch full org data including members
      const data = await orgApi.getCurrent().catch(() => null);
      if (data) {
        setOrg(data.org);
        setMembers(data.members);
        if (data.settings) {
          setOrgSettings(data.settings);
          applyOrgTheme(data.settings);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshOrg();
    } else {
      setOrg(null);
      setOrgSettings(null);
      setLoading(false);
    }
  }, [user, refreshOrg]);

  const updateSettings = async (updates: Partial<OrgSettings>) => {
    const saved = await orgSettingsApi.update(updates);
    setOrgSettings(saved);
    applyOrgTheme(saved);
  };

  return (
    <OrgContext.Provider value={{ org, orgSettings, members, orgRole, loading, updateSettings, refreshOrg, applyTheme: applyOrgTheme }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg must be used within OrgProvider');
  return ctx;
}
