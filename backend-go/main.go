package main

import (
	"log"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/joho/godotenv"
	"github.com/jules-autopilot/backend/api"
	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/services"
)

func main() {
	// Load environment variables from .env in root
	_ = godotenv.Load("../.env")

	// Initialize Database
	db.InitDB()

	// Start Background Services
	services.StartDaemon()
	services.StartWorker()

	app := fiber.New()

	// Setup API Routes
	api.SetupRoutes(app)

	// API Manifest Endpoint
	app.Get("/api/manifest", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"capabilities": []string{"rag", "debate"},
			"version":      "1.0.0-rc.1",
		})
	})

	// WebSocket Middleware
	app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			c.Locals("allowed", true)
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	// WebSocket Endpoint
	app.Get("/ws", websocket.New(func(c *websocket.Conn) {
		// Register new client
		api.ClientsMutex.Lock()
		api.ActiveClients[c] = true
		api.ClientsMutex.Unlock()

		log.Printf("WebSocket client connected: %s", c.RemoteAddr())

		defer func() {
			// Unregister client
			api.ClientsMutex.Lock()
			delete(api.ActiveClients, c)
			api.ClientsMutex.Unlock()
			c.Close()
			log.Printf("WebSocket client disconnected: %s", c.RemoteAddr())
		}()

		for {
			mt, msg, err := c.ReadMessage()
			if err != nil {
				log.Println("WebSocket read error:", err)
				break
			}
			log.Printf("WebSocket message received: %s", msg)

			// Echo message back or handle accordingly
			if err = c.WriteMessage(mt, msg); err != nil {
				log.Println("WebSocket write error:", err)
				break
			}
		}
	}))

	// Start server on port 8085
	log.Fatal(app.Listen(":8085"))
}
