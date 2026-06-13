import React, { useEffect, useMemo, useState } from "react";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Home,
  Lock,
  LogOut,
  Mail,
  MessageSquare,
  Minus,
  Phone,
  Plus,
  PlusCircle,
  Search,
  Send,
  ShoppingBag,
  User,
  Trash2,
} from "lucide-react";

import {
  auth,
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
} from "./firebaseConfig";

import { deleteDoc, setDoc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const BRAND_LOGO = "/img/crispylogo.png";
const BUSINESS_WHATSAPP_NUMBER = "6587977816";
const ADMIN_EMAILS = ["crispyharvest88.biz@gmail.com"];

const COOKIE_DATA = [
  {
    id: "1",
    name: "Pistachio Chewy Cookie",
    category: "Nutty",
    description:
      "Our #1 best seller, the Pistachio Chewy Cookie combines the viral mochi concept with a soft cocoa dusted shell. It has a chewy exterior with a rich pistachio and toasted kataifi filling that gives a crunchy interior. Highly recommended for first time customers!",
    shortDescription:
      "Our #1 best seller — a viral hit that pairs a soft, chewy exterior with a rich, crunchy pistachio interior.",
    price: 6.5,
    image: "/img/pistachio.jpg",
  },
  {
    id: "2",
    name: "Kinder Bueno Chewy Cookie",
    category: "Chocolate",
    description:
      "The Kinder Bueno Chewy Cookie pairs our signature chewy exterior with a creamy hazelnut filling and crispy wafer interior.",
    shortDescription:
      "Our signature chewy shell with a creamy hazelnut filling and crispy wafer interior.",
    price: 6.5,
    image: "/img/kinderbueno.png",
  },
  {
    id: "3",
    name: "Biscoff Chewy Cookie",
    category: "Biscuit",
    description:
      "The Biscoff Chewy Cookie pairs our signature chewy exterior with a smooth Lotus Biscoff spread and crushed biscuit interior.",
    shortDescription:
      "Smooth Lotus Biscoff spread and crushed biscuit inside our signature chewy shell.",
    price: 6.5,
    image: "/img/biscoff.jpg",
  },
  {
    id: "4",
    name: "Nutella Chewy Cookie",
    category: "Chocolate",
    description:
      "The Nutella Chewy Cookie pairs our signature chewy exterior with a rich, smooth Nutella hazelnut chocolate filling.",
    shortDescription:
      "Our signature chewy shell with a rich, smooth Nutella hazelnut chocolate filling.",
    price: 6.5,
    image: "/img/nutella.png",
  },
  {
    id: "5",
    name: "Cookies and Cream Chewy Cookie",
    category: "Creamy",
    description:
      "The Cookies and Cream Chewy Cookie pairs our signature chewy exterior with a creamy vanilla filling and crushed cookie pieces for a sweet, crunchy centre.",
    shortDescription:
      "Creamy vanilla filling with crushed cookie pieces inside our signature chewy shell.",
    price: 6.5,
    image: "/img/cac.png",
  },
];

const INITIAL_MESSAGES = [
  {
    id: 1,
    from: "support",
    text: "Hi there! 👋 Welcome to Crispy's support. How can I help you today?",
  },
  {
    id: 2,
    from: "support",
    text: "Feel free to ask about your orders, our cookies, allergens, or anything else!",
  },
];

const emptyQuantities = {
  "1": 0,
  "2": 0,
  "3": 0,
  "4": 0,
  "5": 0,
};

const INITIAL_STOCK = {
  "1": 12,
  "2": 10,
  "3": 8,
  "4": 9,
  "5": 7,
};

const SCREEN_STORAGE_KEY = "crispyharvest_current_screen";
const TAB_STORAGE_KEY = "crispyharvest_active_tab";
const SELECTED_COOKIE_STORAGE_KEY = "crispyharvest_selected_cookie";

const VALID_SCREENS = ["home", "detail", "cart", "messages", "profile"];
const VALID_TABS = ["home", "cart", "messages", "profile"];

const getSavedValue = (key, fallback, validValues) => {
  try {
    const saved = window.localStorage.getItem(key);
    return validValues.includes(saved) ? saved : fallback;
  } catch {
    return fallback;
  }
};

const getSavedCookie = () => {
  try {
    const savedId = window.localStorage.getItem(SELECTED_COOKIE_STORAGE_KEY);
    return COOKIE_DATA.find((item) => item.id === savedId) || COOKIE_DATA[0];
  } catch {
    return COOKIE_DATA[0];
  }
};

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [loginError, setLoginError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [profileName, setProfileName] = useState("");

  const [currentScreen, setCurrentScreen] = useState(() =>
    getSavedValue(SCREEN_STORAGE_KEY, "home", VALID_SCREENS)
  );

  const [activeTab, setActiveTab] = useState(() =>
    getSavedValue(TAB_STORAGE_KEY, "home", VALID_TABS)
  );

  const [selectedItem, setSelectedItem] = useState(() => getSavedCookie());
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [quantities, setQuantities] = useState(emptyQuantities);
  const [draftQuantities, setDraftQuantities] = useState(emptyQuantities);
  const [stockById, setStockById] = useState(INITIAL_STOCK);

  const [orderPlaced, setOrderPlaced] = useState(false);

  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [chatInput, setChatInput] = useState("");

  const [searchText, setSearchText] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");

  const [promoCode, setPromoCode] = useState("");
  const [promoMessage, setPromoMessage] = useState(
    "No promo code available right now."
  );
  const [discount, setDiscount] = useState(0);

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const cartItems = COOKIE_DATA.filter((item) => (quantities[item.id] || 0) > 0);
  const totalCount = Object.values(quantities).reduce((a, b) => a + b, 0);

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * quantities[item.id],
    0
  );

  const total = Math.max(subtotal - discount, 0);
  const isAdmin = ADMIN_EMAILS.includes(currentUser?.email || "");

  const filteredCookies = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    if (!search) return COOKIE_DATA;

    return COOKIE_DATA.filter((item) =>
      item.name.toLowerCase().startsWith(search)
    );
  }, [searchText]);

  const categoryCookies = useMemo(() => {
    if (selectedCategory === "Best Seller") {
      return COOKIE_DATA.filter((item) => item.id === "1" || item.id === "2");
    }

    return COOKIE_DATA;
  }, [selectedCategory]);

  const navigate = (tab, screen) => {
    const nextScreen = screen || tab;

    setActiveTab(tab);
    setCurrentScreen(nextScreen);

    try {
      window.localStorage.setItem(TAB_STORAGE_KEY, tab);
      window.localStorage.setItem(SCREEN_STORAGE_KEY, nextScreen);
    } catch (error) {
      console.log("Save navigation state error:", error);
    }
  };

  const getDisplayName = () => {
    return profileName || currentUser?.displayName || "User";
  };

  const sortOrders = (orderList) => {
    return orderList.sort((a, b) => {
      const aTime = a.createdAtMillis || 0;
      const bTime = b.createdAtMillis || 0;
      return bTime - aTime;
    });
  };

  const loadOrdersFromFirestore = async (user) => {
    if (!user) return;

    setOrdersLoading(true);

    try {
      let snapshot;

      if (ADMIN_EMAILS.includes(user.email || "")) {
        snapshot = await getDocs(collection(db, "orders"));
      } else {
        const userOrdersQuery = query(
          collection(db, "orders"),
          where("userId", "==", user.uid)
        );

        snapshot = await getDocs(userOrdersQuery);
      }

      const loadedOrders = snapshot.docs.map((document) => {
        const data = document.data();

        return {
          firestoreId: document.id,
          ...data,
          createdAtMillis:
            data.createdAtMillis ||
            data.createdAt?.toMillis?.() ||
            Date.now(),
        };
      });

      setOrders(sortOrders(loadedOrders));
    } catch (error) {
      console.log("Load orders error:", error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadStockFromFirestore = async () => {
    try {
      const stockRef = doc(db, "settings", "stockAvailability");
      const stockSnap = await getDoc(stockRef);

      if (stockSnap.exists()) {
        const data = stockSnap.data();
        const savedStock = data.stockById || {};

        setStockById({
          ...INITIAL_STOCK,
          ...savedStock,
        });
      } else {
        await setDoc(
          stockRef,
          {
            stockById: INITIAL_STOCK,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        setStockById(INITIAL_STOCK);
      }
    } catch (error) {
      console.log("Load stock error:", error);
    }
  };

  const saveStockToFirestore = async (nextStock) => {
    try {
      const stockRef = doc(db, "settings", "stockAvailability");

      await setDoc(
        stockRef,
        {
          stockById: nextStock,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.log("Save stock error:", error);
      alert("Stock updated on screen, but could not be saved. Please try again.");
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setProfileName(user.displayName || "");
        setIsLoggedIn(true);
      } else {
        setCurrentUser(null);
        setProfileName("");
        setIsLoggedIn(false);

        try {
          window.localStorage.removeItem(SCREEN_STORAGE_KEY);
          window.localStorage.removeItem(TAB_STORAGE_KEY);
          window.localStorage.removeItem(SELECTED_COOKIE_STORAGE_KEY);
        } catch (error) {
          console.log("Clear saved navigation error:", error);
        }
      }

      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady || !isLoggedIn) return;

    try {
      window.localStorage.setItem(SCREEN_STORAGE_KEY, currentScreen);
      window.localStorage.setItem(TAB_STORAGE_KEY, activeTab);

      if (selectedItem?.id) {
        window.localStorage.setItem(SELECTED_COOKIE_STORAGE_KEY, selectedItem.id);
      }
    } catch (error) {
      console.log("Save current page error:", error);
    }
  }, [authReady, isLoggedIn, currentScreen, activeTab, selectedItem]);

  useEffect(() => {
    if (isLoggedIn && currentUser) {
      loadOrdersFromFirestore(currentUser);
      loadStockFromFirestore();
    }
  }, [isLoggedIn, currentUser]);

  const handleSignup = async () => {
    setLoginError("");
    setResetMessage("");

    if (!signupName.trim() || !loginEmail.trim() || !loginPassword.trim()) {
      setLoginError("Please fill in all fields.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        loginEmail.trim(),
        loginPassword
      );

      await updateProfile(userCredential.user, {
        displayName: signupName.trim(),
      });

      await signOut(auth);

      setResetMessage("Account created successfully. Please log in now.");
      setIsSignupMode(false);
      setSignupName("");
      setLoginPassword("");
      setCurrentUser(null);
      setProfileName("");
      setIsLoggedIn(false);
    } catch (error) {
      console.log("Signup error:", error.code, error.message);

      if (error.code === "auth/email-already-in-use") {
        setLoginError("This email already has an account. Please log in instead.");
      } else if (error.code === "auth/weak-password") {
        setLoginError("Password must be at least 6 characters.");
      } else if (error.code === "auth/invalid-email") {
        setLoginError("Please enter a valid email address.");
      } else {
        setLoginError(`Signup failed: ${error.code}`);
      }
    }
  };

  const handleLogin = async () => {
    setLoginError("");
    setResetMessage("");

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError("Please enter email and password.");
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        loginEmail.trim(),
        loginPassword
      );

      setCurrentUser(userCredential.user);
      setProfileName(userCredential.user.displayName || "");
      setIsLoggedIn(true);
    } catch (error) {
      console.log("Login error:", error.code, error.message);

      if (error.code === "auth/invalid-credential") {
        setLoginError("Invalid email or password.");
      } else if (error.code === "auth/user-not-found") {
        setLoginError("No account found. Please sign up first.");
      } else if (error.code === "auth/wrong-password") {
        setLoginError("Wrong password.");
      } else {
        setLoginError(`Login failed: ${error.code}`);
      }
    }
  };

  const handleForgotPassword = async () => {
    setLoginError("");
    setResetMessage("");

    const email = loginEmail.trim();

    if (!email) {
      setResetMessage("Please enter your email address first.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/send-reset-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResetMessage(data.message || "Failed to send reset email.");
        return;
      }

      setResetMessage("Password reset email sent. Please check inbox or spam.");
    } catch (error) {
      console.log("Custom reset error:", error);
      setResetMessage("Could not contact reset email server.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.log(error);
    }

    try {
      window.localStorage.removeItem(SCREEN_STORAGE_KEY);
      window.localStorage.removeItem(TAB_STORAGE_KEY);
      window.localStorage.removeItem(SELECTED_COOKIE_STORAGE_KEY);
    } catch (error) {
      console.log("Clear saved navigation error:", error);
    }

    setCurrentUser(null);
    setIsLoggedIn(false);
    setLoginPassword("");
    setSignupName("");
    setProfileName("");
    setOrders([]);
    setCurrentScreen("home");
    setActiveTab("home");
  };

  const handleQuantityChange = (id, type) => {
    const stock = stockById[id] || 0;

    setQuantities((prev) => {
      const cur = prev[id] || 0;

      if (type === "increment") {
        if (cur >= stock) {
          alert("No more stock available for this cookie.");
          return prev;
        }

        return { ...prev, [id]: cur + 1 };
      }

      if (type === "decrement" && cur > 0) {
        return { ...prev, [id]: cur - 1 };
      }

      return prev;
    });
  };

  const handleDraftQuantityChange = (id, type) => {
    const stock = stockById[id] || 0;
    const currentCartQty = quantities[id] || 0;

    setDraftQuantities((prev) => {
      const cur = prev[id] || 0;

      if (type === "increment") {
        if (currentCartQty + cur >= stock) {
          alert("No more stock available for this cookie.");
          return prev;
        }

        return { ...prev, [id]: cur + 1 };
      }

      if (type === "decrement" && cur > 0) {
        return { ...prev, [id]: cur - 1 };
      }

      return prev;
    });
  };

  const addDraftToCart = (item) => {
    const stock = stockById[item.id] || 0;
    const currentCartQty = quantities[item.id] || 0;
    const draftQty = draftQuantities[item.id] || 0;

    if (stock <= 0) {
      alert("This cookie is currently out of stock.");
      return;
    }

    const requestedQty = draftQty === 0 ? 1 : draftQty;
    const remainingStock = stock - currentCartQty;

    if (remainingStock <= 0) {
      alert("No more stock available for this cookie.");
      return;
    }

    const addQty = Math.min(requestedQty, remainingStock);

    setQuantities((prev) => ({
      ...prev,
      [item.id]: (prev[item.id] || 0) + addQty,
    }));

    setDraftQuantities((prev) => ({
      ...prev,
      [item.id]: 0,
    }));
  };

  const handleStockChange = async (id, type) => {
    const currentStock = stockById[id] || 0;

    let nextValue = currentStock;

    if (type === "increase") {
      nextValue = currentStock + 1;
    }

    if (type === "decrease" && currentStock > 0) {
      nextValue = currentStock - 1;
    }

    if (nextValue === currentStock) return;

    const nextStock = {
      ...stockById,
      [id]: nextValue,
    };

    setStockById(nextStock);
    await saveStockToFirestore(nextStock);
  };

  const applyPromoCode = () => {
    const code = promoCode.trim().toUpperCase();

    if (!code) {
      setDiscount(0);
      setPromoMessage("No promo code available right now.");
      return;
    }

    setDiscount(0);
    setPromoMessage("No active promo code is available right now.");
  };

  const buildWhatsAppUrl = (orderId) => {
    const orderSummary = cartItems
      .map(
        (item) =>
          `${quantities[item.id]}x ${item.name} - $${(
            item.price * quantities[item.id]
          ).toFixed(2)}`
      )
      .join("\n");

    const instructionsText = specialInstructions.trim()
      ? `\nSpecial Instructions: ${specialInstructions.trim()}\n`
      : "";

    const promoText = promoCode.trim()
      ? `\nPromo Code Entered: ${promoCode.trim()} (No discount applied)\n`
      : "";

    const message =
      `Hi! I would like to submit my Crispy Harvest order.\n\n` +
      `Order ID: ${orderId}\n` +
      `Customer Name: ${getDisplayName()}\n` +
      `Customer Email: ${currentUser?.email || loginEmail}\n` +
      `Customer Phone: ${customerPhone.trim()}\n\n` +
      `Order Summary:\n` +
      `${orderSummary}\n\n` +
      `Subtotal: $${subtotal.toFixed(2)}\n` +
      `${discount > 0 ? `Discount: -$${discount.toFixed(2)}\n` : ""}` +
      `Total: $${total.toFixed(2)}\n` +
      `${promoText}` +
      `${instructionsText}\n` +
      `Payment Status: Pending PayNow payment verification\n` +
      `Collection Type: Self-collection\n\n` +
      `Please send me the PayNow payment instructions.\n\n` +
      `This WhatsApp message will be used as my collection receipt.`;

    return `https://wa.me/${BUSINESS_WHATSAPP_NUMBER}?text=${encodeURIComponent(
      message
    )}`;
  };

  const handlePlaceOrder = async () => {
    if (!customerPhone.trim()) {
      alert("Please enter your WhatsApp/contact number.");
      return;
    }

    if (cartItems.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    if (!currentUser) {
      alert("Please log in before placing an order.");
      return;
    }

    const orderId = `ORD-${Date.now().toString().slice(-4)}`;
    const createdAtMillis = Date.now();

    const newOrder = {
      id: orderId,
      userId: currentUser.uid,
      userEmail: currentUser.email,
      customerName: getDisplayName(),
      customerPhone: customerPhone.trim(),
      date: new Date().toLocaleDateString("en-SG", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      items: cartItems.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: quantities[item.id],
        price: item.price,
      })),
      subtotal,
      discount,
      total,
      promoCode: promoCode.trim() || "None",
      specialInstructions: specialInstructions.trim(),
      status: "Pending PayNow payment verification",
      paymentStatus: "Pending",
      createdAtMillis,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      const documentRef = await addDoc(collection(db, "orders"), newOrder);

      const orderWithFirestoreId = {
        ...newOrder,
        firestoreId: documentRef.id,
      };

      setOrders((prev) => sortOrders([orderWithFirestoreId, ...prev]));

      const whatsappUrl = buildWhatsAppUrl(orderId);

      setQuantities(emptyQuantities);
      setCustomerPhone("");
      setSpecialInstructions("");
      setPromoCode("");
      setDiscount(0);
      setPromoMessage("No promo code available right now.");

      window.location.href = whatsappUrl;
    } catch (error) {
      console.log("Save order error:", error);
      alert("Order could not be saved. Please try again.");
    }
  };

  const markOrderAsPaid = async (order) => {
    if (!isAdmin) {
      alert("Only admin can update payment status.");
      return;
    }

    if (!order.firestoreId) {
      alert("This order cannot be updated because it has no Firestore ID.");
      return;
    }

    try {
      await updateDoc(doc(db, "orders", order.firestoreId), {
        status: "Paid / Payment Verified",
        paymentStatus: "Paid",
        paidAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setOrders((prev) =>
        prev.map((item) =>
          item.firestoreId === order.firestoreId
            ? {
                ...item,
                status: "Paid / Payment Verified",
                paymentStatus: "Paid",
              }
            : item
        )
      );

      alert("Order marked as paid.");
    } catch (error) {
      console.log("Mark as paid error:", error);
      alert("Could not update payment status.");
    }
  };

  const deleteOrder = async (order) => {
    if (!isAdmin) {
      alert("Only admin can delete orders.");
      return;
    }

    if (!order.firestoreId) {
      alert("This order cannot be deleted because it has no Firestore ID.");
      return;
    }

    const shouldDelete = window.confirm(
      `Delete order ${order.id}? This removes it from admin order tracking.`
    );

    if (!shouldDelete) return;

    try {
      await deleteDoc(doc(db, "orders", order.firestoreId));

      setOrders((prev) =>
        prev.filter((item) => item.firestoreId !== order.firestoreId)
      );

      alert("Order deleted.");
    } catch (error) {
      console.log("Delete order error:", error);
      alert("Could not delete order. Please try again.");
    }
  };

  const getSupportReply = (text) => {
    const lower = text.toLowerCase();

    if (
      lower.includes("human") ||
      lower.includes("staff") ||
      lower.includes("person") ||
      lower.includes("agent") ||
      lower.includes("talk to someone")
    ) {
      return "Our team will typically respond within 30 minutes during operating hours.";
    }

    if (
      lower.includes("late") ||
      lower.includes("running late") ||
      lower.includes("delay")
    ) {
      return "Please inform us in advance if you are running late. Orders may be released or cancelled if there is no prior notice.";
    }

    if (
      lower.includes("reserve") ||
      lower.includes("reservation") ||
      lower.includes("book first") ||
      lower.includes("hold")
    ) {
      return "No reservations will be made after claiming your cookies. Payment must be made within 15 minutes upon confirmation, otherwise your order will be automatically voided and released to other customers.";
    }

    if (
      lower.includes("where") ||
      lower.includes("collection") ||
      lower.includes("collect") ||
      lower.includes("location") ||
      lower.includes("mrt") ||
      lower.includes("lrt")
    ) {
      return (
        "Collection point: 821313\n" +
        "Nearest MRT: Punggol MRT\n" +
        "Nearest LRT: Nibong LRT (West Loop)\n\n" +
        "Full collection details will be provided after payment confirmation."
      );
    }

    if (
      lower.includes("quality") ||
      lower.includes("concern") ||
      lower.includes("smell") ||
      lower.includes("condition") ||
      lower.includes("refund") ||
      lower.includes("issue")
    ) {
      return "Customers are strongly encouraged to check the condition, smell, and quality of the cookies upon collection. Any issues must be raised on the spot for us to assist accordingly. Once the order has been collected and left the collection point, we will not be responsible for any subsequent concerns raised.";
    }

    if (
      lower.includes("allergen") ||
      lower.includes("allergy") ||
      lower.includes("nut") ||
      lower.includes("gluten")
    ) {
      return "Our cookies contain gluten, dairy, eggs, and may contain nuts. Pistachio, Kinder Bueno, and Nutella contain nuts. We do not have nut-free options yet.";
    }

    if (lower.includes("track") || lower.includes("order")) {
      return "Your WhatsApp order message is your receipt for collection. Your order is only confirmed after PayNow payment screenshot is verified.";
    }

    if (
      lower.includes("payment") ||
      lower.includes("paynow") ||
      lower.includes("qr")
    ) {
      return "Payment instructions will be sent through WhatsApp after your order is submitted. Payment must be made within 15 minutes upon confirmation.";
    }

    return "Thanks for reaching out! Our team will look into that shortly. 🍪";
  };

  const sendMessage = (presetText) => {
    const text = (presetText || chatInput).trim();

    if (!text) return;

    setMessages((prev) => [...prev, { id: Date.now(), from: "user", text }]);
    setChatInput("");

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          from: "support",
          text: getSupportReply(text),
        },
      ]);
    }, 800);
  };

  const trackOrder = (order) => {
    const orderItems = order.items
      .map((item) => `${item.quantity}× ${item.name}`)
      .join(", ");

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), from: "user", text: `Track order ${order.id}` },
      {
        id: Date.now() + 1,
        from: "support",
        text: `Order ${order.id} is currently: ${order.status}. Items: ${orderItems}. Total: $${order.total.toFixed(2)}. Please show your WhatsApp order message during collection.`,
      },
    ]);

    navigate("messages");
  };

  useEffect(() => {
    const chatBox = document.querySelector(".chat-scroll");

    if (chatBox) {
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  }, [messages, currentScreen]);

  const QuantityControl = ({ itemId, size = "normal" }) => (
    <div
      className={`quantity-control ${size}`}
      onClick={(event) => event.stopPropagation()}
    >
      <button onClick={() => handleQuantityChange(itemId, "decrement")}>
        <Minus size={size === "small" ? 12 : 14} />
      </button>

      <span>{quantities[itemId] || 0}</span>

      <button
        className="primary"
        onClick={() => handleQuantityChange(itemId, "increment")}
      >
        <Plus size={size === "small" ? 12 : 14} />
      </button>
    </div>
  );

  const DraftQuantityControl = ({ itemId, size = "normal" }) => (
    <div
      className={`quantity-control ${size}`}
      onClick={(event) => event.stopPropagation()}
    >
      <button onClick={() => handleDraftQuantityChange(itemId, "decrement")}>
        <Minus size={size === "small" ? 12 : 14} />
      </button>

      <span>{draftQuantities[itemId] || 0}</span>

      <button
        className="primary"
        onClick={() => handleDraftQuantityChange(itemId, "increment")}
      >
        <Plus size={size === "small" ? 12 : 14} />
      </button>
    </div>
  );

  const BottomBar = () => (
    <div className="bottom-tab-bar">
      <button className="tab-item" onClick={() => navigate("home")}>
        <Home size={24} color={activeTab === "home" ? "#A37F61" : "#9E9E9E"} />
        {activeTab === "home" && <span className="active-dot" />}
      </button>

      <button className="tab-item" onClick={() => navigate("messages")}>
        <MessageSquare
          size={24}
          color={activeTab === "messages" ? "#A37F61" : "#9E9E9E"}
        />
        {activeTab === "messages" && <span className="active-dot" />}
      </button>

      <button className="center-cart-tab" onClick={() => navigate("cart")}>
        <ShoppingBag size={22} color="#fff" />
        {totalCount > 0 && <span className="cart-badge">{totalCount}</span>}
      </button>

      <button className="tab-item" onClick={() => navigate("profile")}>
        <User
          size={24}
          color={activeTab === "profile" ? "#A37F61" : "#9E9E9E"}
        />
        {activeTab === "profile" && <span className="active-dot" />}
      </button>
    </div>
  );

  if (!authReady) {
    return null;
  }

  if (!isLoggedIn) {
    return (
      <main className="login-shell">
        <section className="login-screen">
          <div className="login-logo-wrap">
            <img src={BRAND_LOGO} alt="Crispy logo" className="login-logo" />
          </div>

          <h1>{isSignupMode ? "Create Account" : "Welcome Back"}</h1>

          <p className="login-subtitle">
            {isSignupMode
              ? "Sign up to start ordering your cookies"
              : "Log in to continue ordering your cookies"}
          </p>

          {isSignupMode && (
            <label className="input-box">
              <User size={18} />
              <input
                placeholder="Full name"
                value={signupName}
                onChange={(event) => setSignupName(event.target.value)}
              />
            </label>
          )}

          <label className="input-box">
            <Mail size={18} />
            <input
              placeholder="Email address"
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              type="email"
            />
          </label>

          <label className="input-box">
            <Lock size={18} />
            <input
              placeholder="Password"
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              type="password"
            />
          </label>

          <button
            className="login-button"
            disabled={
              !loginEmail.trim() ||
              !loginPassword.trim() ||
              (isSignupMode && !signupName.trim())
            }
            onClick={isSignupMode ? handleSignup : handleLogin}
          >
            {isSignupMode ? "Sign Up" : "Log In"}
          </button>

          {!isSignupMode && (
            <button className="link-button" onClick={handleForgotPassword}>
              Forgot password?
            </button>
          )}

          {loginError && <p className="error-text">{loginError}</p>}
          {resetMessage && <p className="success-text">{resetMessage}</p>}

          <button
            className="signup-switch"
            onClick={() => {
              setIsSignupMode(!isSignupMode);
              setLoginError("");
              setResetMessage("");
            }}
          >
            {isSignupMode
              ? "Already have an account? "
              : "Don’t have an account? "}
            <span>{isSignupMode ? "Log in" : "Sign up"}</span>
          </button>
        </section>
      </main>
    );
  }

  if (orderPlaced) {
    return (
      <main className="app-shell">
        <section className="confirmation-screen">
          <div className="confirmation-icon">
            <CheckCircle size={76} color="#A37F61" />
          </div>

          <h1>Order Submitted!</h1>

          <p>
            WhatsApp will open with your order receipt. Please send the message
            to us, then wait for PayNow payment instructions.
          </p>

          <div className="confirmation-pill">
            <ShoppingBag size={14} />
            Pending payment verification…
          </div>
        </section>
      </main>
    );
  }

  const renderHome = () => (
    <section className="screen-container">
      <div className="mobile-home-view">
        <div className="scroll-content home-scroll-content">
          <header className="home-header">
            <div className="avatar-container">
              <img src={BRAND_LOGO} alt="Crispy logo" />
            </div>

            <div className="header-text-container">
              <h2>Hi, {getDisplayName()} </h2>
              <p>What are you craving today?</p>
            </div>
          </header>

          <label className="search-bar">
            <Search size={18} />
            <input
              placeholder="Search cookies…"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          </label>

          <div className="mobile-cookie-tabs">
            <button
              className={selectedCategory === "All" ? "active" : ""}
              onClick={() => {
                setSelectedCategory("All");
                setSelectedItem(COOKIE_DATA[0]);
              }}
            >
              All Cookies
            </button>

            <button
              className={selectedCategory === "Best Seller" ? "active" : ""}
              onClick={() => {
                setSelectedCategory("Best Seller");
                setSelectedItem(COOKIE_DATA[0]);
              }}
            >
              Best Sellers
            </button>
          </div>

          <div className="section-header">
            <h3>{selectedCategory === "Best Seller" ? "Best Sellers" : "Popular Items"}</h3>
          </div>

          <div className="cookies-grid">
            {categoryCookies.filter((item) => {
              const search = searchText.trim().toLowerCase();
              return !search || item.name.toLowerCase().startsWith(search);
            }).length === 0 ? (
              <div className="no-search-result">
                <Search size={42} color="#E0D6CD" />
                <p>No cookies found</p>
              </div>
            ) : (
              categoryCookies
                .filter((item) => {
                  const search = searchText.trim().toLowerCase();
                  return !search || item.name.toLowerCase().startsWith(search);
                })
                .map((item) => (
                  <article
                    className="cookie-card"
                    key={item.id}
                    onClick={() => {
                      setSelectedItem(item);
                      navigate("home", "detail");
                    }}
                  >
                    <img src={item.image} alt={item.name} />

                    <div className="cookie-card-content">
                      <div className="cookie-title-row">
                        <h3>{item.name}</h3>
                      </div>

                      <p>{item.shortDescription}</p>

                      <p className="stock-text">
                        {(stockById[item.id] || 0) > 0
                          ? `${stockById[item.id]} available`
                          : "Out of stock"}
                      </p>

                      <div className="card-footer">
                        <strong>${item.price.toFixed(2)}</strong>
                        <DraftQuantityControl itemId={item.id} size="normal" />
                      </div>

                      <button
                        className="mobile-add-order-btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          addDraftToCart(item);
                        }}
                      >
                        Add to order
                      </button>
                    </div>
                  </article>
                ))
            )}
          </div>
        </div>
      </div>

      <div className="desktop-home-page">
        <div className="desktop-top-nav">
          <div className="desktop-brand">
            <img src={BRAND_LOGO} alt="Crispy Harvest" />
            <strong>Crispyharvest88</strong>
          </div>

          <div className="desktop-nav-tabs">
            <button className={activeTab === "home" ? "active" : ""} onClick={() => navigate("home")}>
              Home
            </button>

            <button className={activeTab === "cart" ? "active" : ""} onClick={() => navigate("cart")}>
              My Order
            </button>

            <button className={activeTab === "messages" ? "active" : ""} onClick={() => navigate("messages")}>
              Messages
            </button>

            <button className={activeTab === "profile" ? "active" : ""} onClick={() => navigate("profile")}>
              Profile
            </button>
          </div>

          <button className="desktop-search-btn">
            <Search size={20} />
          </button>

          <button className="desktop-cart-pill" onClick={() => navigate("cart")}>
            <ShoppingBag size={16} />
            Cart
            {totalCount > 0 && <span className="desktop-cart-badge">{totalCount}</span>}
          </button>
        </div>

        <div className="desktop-home-grid">
          <section className="desktop-feature-card">
            <div className="desktop-category-row simplified-category-row tabs-only-row">
              <div className="simple-cookie-tabs">
                <button
                  className={selectedCategory === "All" ? "active" : ""}
                  onClick={() => {
                    setSelectedCategory("All");
                    setSelectedItem(COOKIE_DATA[0]);
                  }}
                >
                  All Cookies
                </button>

                <button
                  className={selectedCategory === "Best Seller" ? "active" : ""}
                  onClick={() => {
                    setSelectedCategory("Best Seller");
                    setSelectedItem(COOKIE_DATA[0]);
                  }}
                >
                  Best Sellers
                </button>
              </div>
            </div>

            <div className="desktop-feature-main category-grid-mode">
              {categoryCookies.map((item) => (
                <div
                  key={item.id}
                  className="desktop-category-product-card"
                  onClick={() => {
                    setSelectedItem(item);
                    navigate("home", "detail");
                  }}
                >
                  <img src={item.image} alt={item.name} />

                  <div className="desktop-category-product-info">
                    <span className="desktop-small-label">
                      {selectedCategory === "All" ? item.category : selectedCategory}
                    </span>
                    <h2>{item.name}</h2>
                    <p>{item.shortDescription}</p>

                    <p className="stock-text">
                      {(stockById[item.id] || 0) > 0
                        ? `${stockById[item.id]} available`
                        : "Out of stock"}
                    </p>

                    <div className="desktop-category-price-row">
                      <strong>${item.price.toFixed(2)}</strong>
                      <DraftQuantityControl itemId={item.id} size="small" />
                    </div>

                    <button
                      className="desktop-add-order-btn"
                      onClick={(event) => {
                        event.stopPropagation();
                        addDraftToCart(item);
                      }}
                    >
                      Add to order
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="desktop-order-summary-card">
            <div className="desktop-order-title">
              <h3>My Order</h3>
              <span>{totalCount} item(s)</span>
            </div>

            {cartItems.length === 0 ? (
              <div className="desktop-empty-order">
                <ShoppingBag size={42} />
                <p>No cookies selected yet.</p>
              </div>
            ) : (
              cartItems.map((item) => (
                <div className="desktop-order-row" key={item.id}>
                  <img src={item.image} alt={item.name} />

                  <div>
                    <strong>{item.name.replace(" Chewy Cookie", "")}</strong>
                    <span>${item.price.toFixed(2)}</span>
                  </div>

                  <QuantityControl itemId={item.id} size="small" />
                </div>
              ))
            )}

            <div className="desktop-promo-line">
              <span>Promo Code</span>
              <strong>None</strong>
            </div>

            <div className="desktop-total-line">
              <span>Total</span>
              <strong>${total.toFixed(2)}</strong>
            </div>

            <button
              className="desktop-confirm-order"
              onClick={() => navigate("cart")}
            >
              Confirm Order
            </button>
          </aside>
        </div>
      </div>

      <BottomBar />
    </section>
  );

  const renderDetail = () => {
    const item = selectedItem;

    return (
      <section className="screen-container detail-screen">
        <div className="top-nav">
          <button className="circle-btn" onClick={() => navigate("home")}>
            <ArrowLeft size={22} />
          </button>

          <h2>{item.name}</h2>

          <button className="detail-cart-top-btn" onClick={() => navigate("cart")}>
            <ShoppingBag size={18} />
            {totalCount > 0 && <span className="detail-cart-badge">{totalCount}</span>}
          </button>
        </div>

        <div className="scroll-content detail-content">
          <div className="hero-image-container">
            <img src={item.image} alt={item.name} />
          </div>

          <div className="detail-text-card">
            <h1>{item.name}</h1>
            <p>{item.description}</p>

            <p className="stock-text detail-stock-text">
              {(stockById[item.id] || 0) > 0
                ? `${stockById[item.id]} available`
                : "Out of stock"}
            </p>

            <div className="detail-price-row">
              <strong>${item.price.toFixed(2)}</strong>

              <div className="detail-action-row">
                <DraftQuantityControl itemId={item.id} size="large" />

                <button
                  className={`detail-inline-add-button ${
                    stockById[item.id] <= 0 ? "disabled" : ""
                  }`}
                  onClick={() => addDraftToCart(item)}
                >
                  Add to order
                </button>
              </div>
            </div>
          </div>

          <div className="suggestions-container">
            <h3>You might also like</h3>

            <div className="suggestion-row">
              {COOKIE_DATA.filter((cookie) => cookie.id !== item.id).map(
                (suggestion) => (
                  <button
                    className="suggestion-card"
                    key={suggestion.id}
                    onClick={() => setSelectedItem(suggestion)}
                  >
                    <img src={suggestion.image} alt={suggestion.name} />

                    <div>
                      <h4>{suggestion.name}</h4>
                      <p>${suggestion.price.toFixed(2)}</p>
                    </div>
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </section>
    );
  };

  const renderCart = () => (
    <section className="screen-container cart-screen">
      <div className="cart-header">
        <button className="circle-btn" onClick={() => navigate("home")}>
          <ArrowLeft size={22} />
        </button>

        <h2>My Order</h2>

        <div className="header-spacer" />
      </div>

      {cartItems.length === 0 ? (
        <div className="empty-cart">
          <ShoppingBag size={64} color="#E0D6CD" />
          <h2>Your cart is empty</h2>
          <p>Add some cookies to get started!</p>

          <button className="browse-button" onClick={() => navigate("home")}>
            Browse Menu
          </button>
        </div>
      ) : (
        <div className="scroll-content cart-content checkout-layout">
          <div className="checkout-left-column">
            <div className="collection-banner">
              <div className="collection-banner-icon">
                <ShoppingBag size={18} />
              </div>

              <div>
                <h3>Self-Collection Only</h3>
                <p>No delivery available. Pick up at our collection point.</p>
              </div>
            </div>

            <div className="checkout-card checkout-order-card">
              <h3 className="checkout-card-title order-summary-title">Order Summary</h3>

              {cartItems.map((item) => (
                <article className="order-item-card" key={item.id}>
                  <img src={item.image} alt={item.name} />

                  <div className="order-item-info">
                    <h4>{item.name}</h4>
                    <p>${item.price.toFixed(2)} each</p>
                    <QuantityControl itemId={item.id} size="small" />
                  </div>

                  <strong>
                    ${(item.price * quantities[item.id]).toFixed(2)}
                  </strong>
                </article>
              ))}

              <button className="add-more-button" onClick={() => navigate("home")}>
                <PlusCircle size={18} />
                Add more items
              </button>
            </div>

            <div className="checkout-card checkout-promo-card">
              <h3 className="checkout-card-title promo-title">Promo Code</h3>

              <div className="promo-code-card">
                <input
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChange={(event) => setPromoCode(event.target.value)}
                />

                <button onClick={applyPromoCode}>Apply</button>
              </div>

              {promoMessage && (
                <p className={discount > 0 ? "promo-success" : "promo-info"}>
                  {promoMessage}
                </p>
              )}
            </div>

            <div className="checkout-card checkout-instructions-card">
              <h3 className="checkout-card-title instructions-title">Special Instructions</h3>

              <textarea
                className="instructions-box"
                placeholder="E.g. extra napkins, no box…"
                value={specialInstructions}
                onChange={(event) => setSpecialInstructions(event.target.value)}
              />
            </div>
          </div>

          <div className="checkout-right-column">
            <div className="checkout-card checkout-contact-card">
              <h3 className="checkout-card-title contact-title">Contact Number</h3>

              <label className="phone-input-box">
                <Phone size={18} />
                <input
                  placeholder="Enter your WhatsApp/contact number"
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                />
              </label>
            </div>

            <div className="checkout-card checkout-payment-card">
              <h3 className="checkout-card-title payment-title">Payment</h3>

              <div className="payment-card">
                <div className="paynow-badge">PayNow</div>
                <p>
                  Payment instructions will be sent through WhatsApp after your
                  order is submitted.
                </p>
              </div>
            </div>

            <div className="checkout-card checkout-price-card">
              <h3 className="checkout-card-title price-title">Price Details</h3>

              <div className="price-breakdown-card">
                <div>
                  <span>Subtotal</span>
                  <strong>${subtotal.toFixed(2)}</strong>
                </div>

                {discount > 0 && (
                  <>
                    <hr />
                    <div>
                      <span>Promo Discount</span>
                      <strong className="green-text">
                        -${discount.toFixed(2)}
                      </strong>
                    </div>
                  </>
                )}

                <hr />

                <div>
                  <span>Delivery</span>
                  <strong className="green-text">Free (Self-collection)</strong>
                </div>

                <hr />

                <div className="total-row">
                  <span>Total</span>
                  <strong>${total.toFixed(2)}</strong>
                </div>
              </div>
            </div>

            <footer className="place-order-footer">
              <div className="place-order-summary">
                <p>
                  {totalCount} item{totalCount > 1 ? "s" : ""}
                </p>

                <strong>${total.toFixed(2)}</strong>
              </div>

              <button
                className={`place-order-button ${
                  !customerPhone.trim() ? "disabled" : ""
                }`}
                onClick={handlePlaceOrder}
              >
                Submit Order <ArrowRight size={18} />
              </button>
            </footer>
          </div>
        </div>
      )}
    </section>
  );

  const renderMessages = () => (
    <section className="screen-container messages-screen">
      <header className="chat-header">
        <button className="chat-back-btn" onClick={() => navigate("home")}>
          <ArrowLeft size={22} />
        </button>
        <div className="chat-agent-avatar">
          <img src={BRAND_LOGO} alt="Crispy Support" />
        </div>

        <div>
          <h2>Crispy Support</h2>
          <p>● Online — typically replies instantly</p>
        </div>
      </header>

      <div className="chat-scroll">
        <div className="chat-date-marker">Today</div>

        {messages.map((message) => (
          <div
            key={message.id}
            className={`bubble-row ${message.from === "user" ? "user" : ""}`}
          >
            {message.from === "support" && (
              <div className="bubble-avatar">
                <img src={BRAND_LOGO} alt="Support" />
              </div>
            )}

            <div
              className={`bubble ${
                message.from === "user" ? "bubble-user" : "bubble-support"
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}

        <div className="quick-replies-row">
          {["Where is collection?", "Can I reserve first?", "Late collection", "Quality concerns", "Talk to human"].map(
            (chip) => (
              <button key={chip} onClick={() => sendMessage(chip)}>
                {chip}
              </button>
            )
          )}
        </div>
      </div>

      <footer className="chat-input-row">
        <input
          placeholder="Type a message…"
          value={chatInput}
          onChange={(event) => setChatInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") sendMessage();
          }}
        />

        <button
          className={!chatInput.trim() ? "disabled" : ""}
          onClick={() => sendMessage()}
        >
          <Send size={18} />
        </button>
      </footer>

      <BottomBar />
    </section>
  );

  const renderProfile = () => (
    <section className="screen-container">
      <div className="profile-top-bar">
        <button className="circle-btn" onClick={() => navigate("home")}>
          <ArrowLeft size={22} />
        </button>

        <h2>Profile</h2>

        <div className="header-spacer" />
      </div>

      <div className="scroll-content">
        <div className="profile-hero">
          <div className="profile-avatar-ring">
            <img src={BRAND_LOGO} alt="Profile" />
          </div>

          <h1>{getDisplayName()}</h1>
          <p>{currentUser?.email || loginEmail}</p>
        </div>

        {isAdmin && (
          <>
            <h3 className="order-section-label">Stock Management</h3>

            <div className="stock-admin-card">
              {COOKIE_DATA.map((item) => (
                <div className="stock-admin-row" key={item.id}>
                  <img src={item.image} alt={item.name} />

                  <div>
                    <h4>{item.name}</h4>
                    <p>
                      {(stockById[item.id] || 0) > 0
                        ? `${stockById[item.id]} available`
                        : "Out of stock"}
                    </p>
                  </div>

                  <div className="stock-admin-control">
                    <button onClick={() => handleStockChange(item.id, "decrease")}>
                      <Minus size={14} />
                    </button>

                    <span>{stockById[item.id] || 0}</span>

                    <button onClick={() => handleStockChange(item.id, "increase")}>
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <h3 className="order-section-label">
          {isAdmin ? "All Orders" : "Order History"}
        </h3>

        {ordersLoading ? (
          <div className="empty-profile-card">
            <p>Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-profile-card">
            <p>No orders yet. Your submitted orders will appear here.</p>
          </div>
        ) : (
          orders.map((order) => (
            <article className="past-order-card" key={order.firestoreId || order.id}>
              <div className="past-order-top">
                <div>
                  <h4>{order.id}</h4>
                  <p>{order.date}</p>
                </div>

                <span className="delivered-badge">
                  <CheckCircle size={13} />
                  {order.status}
                </span>
              </div>

              <hr />

              {isAdmin && (
                <>
                  <p className="past-order-item">
                    Customer: {order.customerName || "Unknown"}
                  </p>
                  <p className="past-order-item">
                    Email: {order.userEmail || "Unknown"}
                  </p>
                </>
              )}

              {order.items.map((item, index) => (
                <p className="past-order-item" key={index}>
                  • {item.quantity}× {item.name}
                </p>
              ))}

              <p className="past-order-item">Contact: {order.customerPhone}</p>

              {order.specialInstructions && (
                <p className="past-order-item">
                  Notes: {order.specialInstructions}
                </p>
              )}

              {order.discount > 0 && (
                <p className="past-order-item">
                  Promo Discount: -${order.discount.toFixed(2)}
                </p>
              )}

              <div className="past-order-bottom">
                <strong>Total: ${order.total.toFixed(2)}</strong>

                <div>
                  <button
                    className="track-order-btn"
                    onClick={() => trackOrder(order)}
                  >
                    Track
                  </button>

                  {isAdmin && order.paymentStatus !== "Paid" && (
                    <button
                      className="reorder-btn"
                      onClick={() => markOrderAsPaid(order)}
                    >
                      Mark as Paid
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      className="delete-order-btn"
                      onClick={() => deleteOrder(order)}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  )}

                  {!isAdmin && (
                    <button
                      className="reorder-btn"
                      onClick={() => navigate("home")}
                    >
                      Reorder
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))
        )}

        <div className="legal-footer-links">
          <button>Privacy Policy</button>
          <span>•</span>
          <button>Terms & Conditions</button>
        </div>

        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={17} />
          Log Out
        </button>
      </div>

      <BottomBar />
    </section>
  );

  return (
    <main className="app-shell">
      <div className="desktop-main-area">
        {currentScreen === "home" && renderHome()}
        {currentScreen === "detail" && renderDetail()}
        {currentScreen === "cart" && renderCart()}
        {currentScreen === "messages" && renderMessages()}
        {currentScreen === "profile" && renderProfile()}
      </div>
    </main>
  );
}