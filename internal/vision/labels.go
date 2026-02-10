package vision

import (
	"bufio"
	"fmt"
	"os"
	"strings"
)

type Label struct {
	EN string
	ZH string
}

func LoadLabels(path string) ([]Label, error) {
	if strings.TrimSpace(path) == "" {
		return nil, fmt.Errorf("labels path is required")
	}

	file, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("open labels file: %w", err)
	}
	defer file.Close()

	var labels []Label
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		label, ok := parseLabelLine(line)
		if !ok {
			continue
		}
		labels = append(labels, label)
	}
	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("scan labels file: %w", err)
	}
	if len(labels) == 0 {
		return nil, fmt.Errorf("labels file is empty")
	}
	return labels, nil
}

func parseLabelLine(line string) (Label, bool) {
	if line == "" {
		return Label{}, false
	}

	sep := ""
	switch {
	case strings.Contains(line, "\t"):
		sep = "\t"
	case strings.Contains(line, "|"):
		sep = "|"
	case strings.Contains(line, ","):
		sep = ","
	}

	if sep == "" {
		return Label{EN: strings.TrimSpace(line)}, true
	}

	parts := strings.SplitN(line, sep, 2)
	en := strings.TrimSpace(parts[0])
	if en == "" {
		return Label{}, false
	}
	zh := ""
	if len(parts) > 1 {
		zh = strings.TrimSpace(parts[1])
	}
	return Label{EN: en, ZH: zh}, true
}
