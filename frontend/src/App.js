// src/App.js

import React from "react";
import AjoutCamionForm from "./components/AjoutCamionForm";

function App() {
  return (
    <div className="App">
      <h1 style={{ textAlign: "center", marginTop: "30px" }}>
        🚛 Second Lease - Ajouter un Camion
      </h1>
      <AjoutCamionForm />
    </div>
  );
}

export default App;
