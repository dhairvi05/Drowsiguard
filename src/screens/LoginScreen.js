import React, { useState } from 'react';
import {useContext} from 'react';
import { View, Text, TextInput, Button, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { login as apiLogin } from "../api/api";
import Logo from "../components/Logo";
import { AuthContext } from '../context/AuthContext';
export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const { login } = useContext(AuthContext);

  const handleLogin = async () => {
    try {
      const data = await apiLogin(email, password);
      console.log("Login success:", data);
      login(data.user); // Use context login
    } catch (err) {
      console.log(err.response?.data?.message);
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}} keyboardVerticalOffset={64}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Logo size={1.0} />
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#81e4f9"value={email} onChangeText={setEmail} />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#81e4f9"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Button title="Login" onPress={handleLogin} />
        {error ? <Text style={{ color: "red" }}>{error}</Text> : null}
        <Text style={styles.link} onPress={() => navigation.navigate("Signup")}>
          Don’t have an account? Sign up
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#000000"},
  title: { fontSize: 22, fontWeight: "bold", textAlign: "center", marginBottom: 20 },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5, color:"#81e4f9", borderColor: "#81e4f9"},
  link: { color: "#81e4f9", textAlign: "center", marginTop: 10 }
});
