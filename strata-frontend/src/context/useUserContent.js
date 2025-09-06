'use client';

import { useContext } from 'react';
import { UserContext } from './UserContextProvider';

export const useUserContext = () => useContext(UserContext);
