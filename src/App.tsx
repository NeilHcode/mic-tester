import MicTester from "./components/MicTester";

function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        background: "#0f172a",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        boxSizing: "border-box",
      }}
    >
      <MicTester />
    </div>
  );
}

export default App;