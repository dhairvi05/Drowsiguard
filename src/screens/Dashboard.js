import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import DriverDashboard from "./DriverDashboard";
import PassengerDashboard from "./PassengerDashboard";

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  if (user?.role === "Driver") return <DriverDashboard />;
  if (user?.role === "Passenger") return <PassengerDashboard />;
  return null;
}

