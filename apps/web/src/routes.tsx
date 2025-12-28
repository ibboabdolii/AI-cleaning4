import { lazy } from 'react';

const Home = lazy(() => import('./pages/Home'));
const Pricing = lazy(() => import('./pages/Pricing'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Contact = lazy(() => import('./pages/Contact'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const NotFound = lazy(() => import('./pages/NotFound'));

export const routes = [
  { path: '/', element: <Home />, title: 'Home' },
  { path: '/pricing', element: <Pricing />, title: 'Pricing' },
  { path: '/faq', element: <FAQ />, title: 'FAQ' },
  { path: '/contact', element: <Contact />, title: 'Contact' },
  { path: '/login', element: <Login />, title: 'Login' },
  { path: '/dashboard', element: <Dashboard />, title: 'Dashboard' },
  { path: '*', element: <NotFound />, title: 'Not Found' }
];
