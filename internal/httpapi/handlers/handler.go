package handlers

import (
	"context"
	"log"
	"strings"

	"github.com/suPer8Hu/ai-platform/internal/ai"
	"github.com/suPer8Hu/ai-platform/internal/chat"
	"github.com/suPer8Hu/ai-platform/internal/config"
	"github.com/suPer8Hu/ai-platform/internal/email"
	"github.com/suPer8Hu/ai-platform/internal/store/rabbitmq"
	"github.com/suPer8Hu/ai-platform/internal/store/redisstore"
	"github.com/suPer8Hu/ai-platform/internal/vision"
	"gorm.io/gorm"
)

type Handler struct {
	DB          *gorm.DB
	Cfg         config.Config
	Redis       *redisstore.Store
	SMTPSetting email.SMTPConfig
	ChatSvc     *chat.Service
	Rabbit      *rabbitmq.Publisher
	VisionSvc   *vision.Service
	VisionVLM   vision.VLM
}

func NewHandler(db *gorm.DB, cfg config.Config, r *redisstore.Store) *Handler {
	repo := chat.NewRepo(db)
	// real provider
	// provider := ai.NewOllamaProvider("http://localhost:11434", "llama3:latest")
	// var provider ai.Provider
	// switch strings.ToLower(cfg.AIProvider) {
	// case "", "ollama":
	// 	provider = ai.NewOllamaProvider(cfg.OllamaBaseURL, cfg.OllamaModel)
	// default:
	// 	panic(fmt.Sprintf("unsupported AI_PROVIDER=%q", cfg.AIProvider))
	// }

	// Provider registry (route by session.Provider + session.Model)
	reg := ai.NewRegistry()

	// Register Ollama (default)
	reg.Register("ollama", func(ctx context.Context, model string) (ai.Provider, error) {
		m := strings.TrimSpace(model)
		if m == "" {
			m = cfg.OllamaModel
		}
		return ai.NewOllamaProvider(cfg.OllamaBaseURL, m), nil
	})

	// Register OpenRouter (OpenAI-compatible)
	reg.Register("openrouter", func(ctx context.Context, model string) (ai.Provider, error) {
		_ = ctx
		m := strings.TrimSpace(model)
		if m == "" {
			m = cfg.OpenRouterModel
		}
		return ai.NewOpenRouterProvider(
			cfg.OpenRouterBaseURL,
			cfg.OpenRouterAPIKey,
			m,
			cfg.OpenRouterSiteURL,
			cfg.OpenRouterAppName,
		), nil
	})

	chatSvc := chat.NewService(repo, reg, cfg.ChatContextWindowSize)

	// rabbitmq
	pub, err := rabbitmq.NewPublisher(cfg.RabbitURL, cfg.RabbitQueue)
	if err != nil {
		panic(err)
	}

	var visionSvc *vision.Service
	if strings.TrimSpace(cfg.VisionModelPath) != "" && strings.TrimSpace(cfg.VisionLabelsPath) != "" {
		classifier, err := vision.NewONNXClassifier(vision.Config{
			ModelPath:  cfg.VisionModelPath,
			LabelsPath: cfg.VisionLabelsPath,
			InputH:     cfg.VisionInputH,
			InputW:     cfg.VisionInputW,
			InputName:  cfg.VisionInputName,
			OutputName: cfg.VisionOutputName,
			OrtLibraryPath: cfg.VisionOrtLibPath,
		})
		if err != nil {
			log.Printf("vision init failed: %v", err)
		} else {
			visionSvc, err = vision.NewService(classifier, cfg.VisionTopK, cfg.VisionTopKMax)
			if err != nil {
				log.Printf("vision service init failed: %v", err)
			}
		}
	} else {
		log.Printf("vision disabled: missing VISION_MODEL_PATH or VISION_LABELS_PATH")
	}

	visionVLMModel := strings.TrimSpace(cfg.VisionVLMModel)
	visionVLMProvider := strings.ToLower(strings.TrimSpace(cfg.VisionVLMProvider))
	if visionVLMProvider == "" {
		if strings.TrimSpace(cfg.VisionGeminiAPIKey) != "" {
			visionVLMProvider = "gemini"
		}
	}

	var visionVLM vision.VLM
	switch visionVLMProvider {
	case "gemini":
		model := strings.TrimSpace(cfg.VisionGeminiModel)
		if model == "" {
			model = "gemini-2.0-flash"
		}
		vlm, err := vision.NewGeminiVLM(vision.VLMConfig{
			BaseURL: cfg.VisionGeminiBaseURL,
			APIKey:  cfg.VisionGeminiAPIKey,
			Model:   model,
		})
		if err != nil {
			log.Printf("vision vlm init failed: %v", err)
		} else {
			visionVLM = vlm
		}
	default:
		log.Printf("vision vlm disabled: unknown VISION_VLM_PROVIDER=%q", visionVLMProvider)
	}

	return &Handler{DB: db, Cfg: cfg, Redis: r, SMTPSetting: email.SMTPConfig{Host: cfg.SMTPHost,
		Port: cfg.SMTPPort,
		User: cfg.SMTPUser,
		Pass: cfg.SMTPPass,
		From: cfg.SMTPFrom},
		ChatSvc: chatSvc,
		Rabbit:  pub,
		VisionSvc: visionSvc,
		VisionVLM: visionVLM,
	}
}
