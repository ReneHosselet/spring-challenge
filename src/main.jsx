import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import $ from 'jquery'
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

$(document).ready(function ($) {
  console.log(`Looking under the hood? Interested in our work or a job?
Contact us via 3dconfig.com.
 _____ ____     ____ ___  _   _ _____ ___ ____ 
|___ /|  _ \\   / ___/ _ \\| \\ | |  ___|_ _/ ___|
  |_ \\| | | | | |  | | | |  \\| | |_   | | |  _ 
 ___) | |_| | | |__| |_| | |\\  |  _|  | | |_| |
|____/|____/   \\____\\___/|_| \\_|_|   |___\\____|
`);
});
