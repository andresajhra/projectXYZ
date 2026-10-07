import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api";
import { useGoogleLogin } from "./use-auth";

export function GoogleButton() {
  const navigate = useNavigate();
  const { mutate } = useGoogleLogin();
  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) return null;

  return (
    <GoogleLogin
      onSuccess={(res) =>
        res.credential &&
        mutate(
          { idToken: res.credential },
          { onSuccess: () => navigate("/app"), onError: (e) => toast.error(apiErrorMessage(e)) },
        )
      }
      onError={() => toast.error("Google sign-in failed")}
    />
  );
}
