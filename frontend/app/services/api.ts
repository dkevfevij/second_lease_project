import { API_BASE_URL } from "../config";

interface LoginData {
  username: string;
  password: string;
}

export const loginUser = async (loginData: LoginData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(loginData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erreur d'authentification");
    }

    return await response.json(); // { message, user }
  } catch (error) {
    throw error;
  }
};
