import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import ClassroomPage from './ClassroomPage';
import StudentClassroom from './StudentClassroom';

/**
 * One route, two audiences: anyone who can publish sees the trainer/admin
 * console; everyone else (students) sees their own work + submissions.
 */
const ClassroomSwitch = () => {
  const { can } = usePermissions();
  return can('classroom.create') ? <ClassroomPage /> : <StudentClassroom />;
};

export default ClassroomSwitch;
