// src/services/api.js

import { API_BASE_URL } from '../config';


export const ajouterCamion = async (camionData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/camions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(camionData),
    });

    if (!response.ok) {
      throw new Error("Erreur lors de l'enregistrement du camion");
    }

    return await response.json();
  } catch (error) {
    console.error("❌ Erreur API :", error.message);
    throw error;
  }
};
