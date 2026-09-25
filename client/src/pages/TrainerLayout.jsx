import React from 'react';
import { LayoutDashboard, Users, ClipboardCheck, GraduationCap } from 'lucide-react';
import StaffLayout from '../components/StaffLayout';

const navItems = [
  { to: '/trainer', icon: <LayoutDashboard size={18} />, label: 'Dashboard', end: true },
  { to: '/trainer/students', icon: <Users size={18} />, label: 'My Students' },
  { to: '/trainer/attendance', icon: <ClipboardCheck size={18} />, label: 'Attendance' },
  { to: '/trainer/marks', icon: <GraduationCap size={18} />, label: 'Marks' },
];

export default function TrainerLayout() {
  return <StaffLayout title="Trainer Workspace" subtitle="Class management and student progress" navItems={navItems} />;
}
