import React from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import MainMenu from "@/pages/MainMenu";
import VerifyProof from "@/pages/VerifyProof";
import GenerateProof from "@/pages/GenerateProof";

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/verify" element={<VerifyProof />} />
        <Route path="/generate" element={<GenerateProof />} />
      </Routes>
    </HashRouter>
  );
};

export default App;

