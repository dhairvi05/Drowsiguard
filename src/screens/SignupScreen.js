import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { signup } from "../api/api";
import Logo from "../components/Logo";

export default function SignupScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async () => {
    // Clear previous messages
    setError("");
    setSuccess("");
    
    // Basic validation
    if (!name || !email || !password || !role) {
      setError("Please fill in all fields");
      return;
    }
    
    setIsLoading(true);
    try {
      const data = await signup(name, email, password, role);
      console.log("Signup success:", data);
      
      // Show success message
      setSuccess("Account created successfully! Redirecting to login...");
      
      // Navigate to login after a short delay
      setTimeout(() => {
        navigation.navigate("Login");
      }, 2000);
      
    } catch (err) {
      console.log(err.response?.data?.message);
      setError(err.response?.data?.message || "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}} keyboardVerticalOffset={64}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Logo size={1.0} />
        <TextInput style={styles.input} placeholder="Name" placeholderTextColor="#81e4f9" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#81e4f9" value={email} onChangeText={setEmail} />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#81e4f9"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TextInput style={styles.input} placeholder="Role (Driver/Passenger)" placeholderTextColor="#81e4f9" value={role} onChangeText={setRole} />
        <Button 
          title={isLoading ? "Creating Account..." : "Signup"} 
          color="#0b7992" 
          onPress={handleSignup}
          disabled={isLoading}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {success ? <Text style={styles.successText}>{success}</Text> : null}
        <Text style={styles.link} onPress={() => navigation.navigate("Login")}>
          Already have an account? Log in
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#000000"},
  title: { fontSize: 22, fontWeight: "bold", textAlign: "center", marginBottom: 20, color:"#92240b"},
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5, color:"#81e4f9", borderColor: "#81e4f9"},
  link: { color: "#81e4f9", textAlign: "center", marginTop: 10 },
  errorText: { 
    color: "#ff4444", 
    textAlign: "center", 
    marginTop: 10, 
    fontSize: 14,
    fontWeight: "500"
  },
  successText: { 
    color: "#44ff44", 
    textAlign: "center", 
    marginTop: 10, 
    fontSize: 14,
    fontWeight: "500"
  }
});