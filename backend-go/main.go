package main

import (
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/joho/godotenv"
	"github.com/jules-autopilot/backend/api"
	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/services"
)

func getProjectRoot() string {
	candidates := []string{filepath.Clean("."), filepath.Clean("..")}
	for _, candidate := range candidates {
		if info, err := os.Stat(filepath.Join(candidate, "package.json")); err == nil && !info.IsDir() {
			return candidate
		}
	}
	return filepath.Clean("..")
}

func serveSPA(c *fiber.Ctx) error {
	requestPath := c.Path()
	if strings.HasPrefix(requestPath, "/api") || strings.HasPrefix(requestPath, "/ws") || requestPath == "/metrics" || requestPath == "/healthz" {
		return c.SendStatus(fiber.StatusNotFound)
	}

	projectRoot, err := filepath.Abs(getProjectRoot())
	if err != nil {
		return c.SendStatus(fiber.StatusInternalServerError)
	}
	if requestPath == "/" {
		requestPath = "/index.html"
	}

	distPath := filepath.Join(projectRoot, "dist")
	candidate := filepath.Join(distPath, filepath.FromSlash(strings.TrimPrefix(requestPath, "/")))
	if info, statErr := os.Stat(candidate); statErr == nil && !info.IsDir() {
		return c.SendFile(candidate)
	}

	indexPath := filepath.Join(distPath, "index.html")
	if info, statErr := os.Stat(indexPath); statErr == nil && !info.IsDir() {
		return c.SendFile(indexPath)
	}

	return c.SendStatus(fiber.StatusNotFound)
}

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

	// Static SPA serving parity with the Bun runtime.
	app.Get("/*", serveSPA)

	// Match the TypeScript daemon default port for smoother drop-in parity.
	log.Fatal(app.Listen(":8080"))
}
