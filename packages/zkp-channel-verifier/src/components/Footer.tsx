import React from "react";

const Footer: React.FC = () => {
  return (
    <footer className="border-t-2 border-[#4fc3f7] bg-gradient-to-b from-[#1a2347] to-[#0a1930] mt-auto" style={{ padding: "24px 0" }}>
      <div className="text-center">
        <h3 className="text-white" style={{ fontSize: "18px", fontWeight: "600" }}>
          Tokamak ZKP Channels
        </h3>
      </div>
    </footer>
  );
};

export default Footer;

