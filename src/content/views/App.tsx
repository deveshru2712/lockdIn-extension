import { useState } from "react";

function App() {
  const [show, setShow] = useState(false);
  const toggle = () => setShow(!show);

  return (
    <div className="popup-container">
      {show && (
        <div
          className={`popup-content ${show ? "opacity-100" : "opacity-0"} bg-green-300`}
        >
          <h1>HELLO CRXJS</h1>
        </div>
      )}
      <button className="toggle-button" onClick={toggle}>
        Yash
      </button>
    </div>
  );
}

export default App;
