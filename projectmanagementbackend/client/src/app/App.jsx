import { RouterProvider } from 'react-router-dom';
import { router } from './router.jsx';
import { Toaster } from '../components/ui/index.js';

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}
