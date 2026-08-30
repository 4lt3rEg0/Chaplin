import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import api from "../services/api";

const LoginFrame = styled.main`
	.chaplin-page-shell {
		max-width: 520px;
		display: grid;
		place-items: center;
	}
`;

const LoginCard = styled.form`
	width: min(460px, 100%);
	padding: 22px;
	display: grid;
	gap: 12px;
`;

const Title = styled.h1`
	margin: 0;
	text-align: center;
	letter-spacing: 0.12em;
	text-transform: uppercase;
	font-size: clamp(20px, 3vw, 28px);
`;

const Label = styled.label`
	font-size: 12px;
	color: ${({ theme }) => theme.colors.textSecondary};
	letter-spacing: 0.08em;
	text-transform: uppercase;
`;

const Input = styled.input`
	padding: 11px 12px;
	border-radius: 12px;
	border: 1px solid ${({ theme }) => theme.card?.border || theme.colors.borderStrong};
	background: ${({ theme }) => theme.card?.bg || theme.gradients.panel};
	color: ${({ theme }) => theme.colors.text};
`;

const SubmitButton = styled.button`
	margin-top: 4px;
	padding: 12px;
	border-radius: 12px;
	border: 1px solid ${({ theme }) => theme.card?.border || theme.colors.borderStrong};
	cursor: pointer;
	text-transform: uppercase;
	letter-spacing: 0.12em;
	font-weight: 700;
	color: ${({ theme }) => theme.colors.text};
	background: ${({ theme }) => theme.colors.accentSoft};
`;

const ErrorText = styled.div`
	color: #ff8da1;
	font-size: 13px;
`;

export default function Login() {
	const navigate = useNavigate();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");

	const onSubmit = async (event) => {
		event.preventDefault();
		setError("");

		try {
			const form = new URLSearchParams();
			form.append("username", username);
			form.append("password", password);

			const { data } = await api.post("/auth/login", form, {
				headers: { "Content-Type": "application/x-www-form-urlencoded" }
			});

			if (data?.access_token) {
				localStorage.setItem("token", data.access_token);
				navigate("/feed");
			} else {
				setError("No se recibió token de acceso.");
			}
		} catch {
			setError("Login fallido. Verifica email/usuario y contraseña.");
		}
	};

	return (
		<LoginFrame className="chaplin-page-frame">
			<div className="chaplin-page-shell">
				<LoginCard className="chaplin-theme-panel" onSubmit={onSubmit}>
					<Title>Iniciar sesión</Title>
					<Label>Usuario o email</Label>
					<Input
					value={username}
					onChange={(e) => setUsername(e.target.value)}
					placeholder="Email o usuario"
					autoComplete="username"
				/>
					<Label>Contrasena</Label>
					<Input
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					placeholder="Contraseña"
					autoComplete="current-password"
				/>
					{error ? <ErrorText>{error}</ErrorText> : null}
					<SubmitButton type="submit">Entrar</SubmitButton>
				</LoginCard>
			</div>
		</LoginFrame>
	);
}
