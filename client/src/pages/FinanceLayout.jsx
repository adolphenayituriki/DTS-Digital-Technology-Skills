import React from 'react';
import { LayoutDashboard, Receipt, Wallet, Users } from 'lucide-react';
import StaffLayout from '../components/StaffLayout';

const navItems = [
  { to: '/finance', icon: <LayoutDashboard size={18} />, label: 'Dashboard', end: true },
  { to: '/finance/students', icon: <Users size={18} />, label: 'Student Balances' },
  { to: '/finance/records', icon: <Receipt size={18} />, label: 'Income & Expenses' },
  { to: '/finance/fees', icon: <Wallet size={18} />, label: 'Intake Fees' },
];

export default function FinanceLayout() {
  return <StaffLayout title="Finance Workspace" subtitle="Payments, intake fees, income, and expenses" navItems={navItems} />;
}
