import { describe, it, expect } from 'vitest';
import { merchantKey } from '../supabase/functions/_shared/merchantKey';

describe('merchantKey — merchant extraction', () => {
  it('strips card/payment noise down to the merchant', () => {
    expect(merchantKey('COMPRA TARJETA *1234 MERCADONA')).toBe('MERCADONA');
    expect(merchantKey('Carrefour')).toBe('CARREFOUR');
    expect(merchantKey('Bounce')).toBe('BOUNCE');
    expect(merchantKey('Pago Movil En Market Imperial, Madrid')).toBe('MARKET IMPERIAL');
  });

  it('produces a stable key for messy merchant strings', () => {
    const k = merchantKey('Stayforlong.com Hotel*BARCELONA');
    expect(k).toBe('STAYFORLONG HOTEL');
    // same merchant, different city suffix → same key
    expect(merchantKey('Stayforlong.com Hotel*MADRID')).toBe(k);
    expect(merchantKey('Iberdrola Clientes, S.a.u')).toMatch(/^IBERDROLA/);
  });
});

describe('merchantKey — PII guard (never store a person)', () => {
  it('returns null for person-to-person payments and transfers', () => {
    expect(merchantKey('Bizum payment to: Persona 1')).toBeNull();
    expect(merchantKey('Bizum payment to: LUZ MARIA I.')).toBeNull();
    expect(merchantKey('To Persona 16')).toBeNull();
    expect(merchantKey('Transfer from ANA DEMO')).toBeNull();
    expect(merchantKey('Transfer to IGNACIO RODRIGUEZ MARIANI & INES MURTAGH')).toBeNull();
    expect(merchantKey('Payment from OXIGENT TECHNOLOGIES S.L.')).toBeNull();
  });

  it('returns null for own-account / savings-pocket movements and interest', () => {
    expect(merchantKey('From EUR Rendimientos Diarios')).toBeNull();
    expect(merchantKey("Net Interest Paid to 'Rendimientos Diarios' for Jun 1, 2026")).toBeNull();
    expect(merchantKey("Deposit to 'Savings Challenge'")).toBeNull();
  });

  it('returns null when the description carries the account owner\'s own name', () => {
    expect(merchantKey('Pago a Ana Demo', { firstName: 'Ana', lastName: 'Demo' })).toBeNull();
    // but a real merchant with the same context is kept
    expect(merchantKey('Mercadona', { firstName: 'Ana', lastName: 'Demo' })).toBe('MERCADONA');
  });
});
