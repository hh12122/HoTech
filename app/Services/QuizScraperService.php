<?php

namespace App\Services;

use App\DTOs\Admin\ScrapedQuestionData;
use App\DTOs\Admin\ScrapedAnswerData;
use Symfony\Component\DomCrawler\Crawler;

class QuizScraperService
{
    public function scrapeFromUrl(string $url): array
    {
        $html = @file_get_contents($url);
        if (!$html) {
            return [];
        }

        return $this->scrapeFromHtml($html);
    }

    public function scrapeFromHtml(string $html): array
    {
        $crawler = new Crawler($html);
        $questions = [];

        // Basic heuristic: find divs or li that might be questions.
        // For demonstration, let's assume questions are in blocks like .question or similar.
        // We will try a generic approach if no specific class matches.
        
        $questionNodes = $crawler->filter('.question, .qcm-question, li, p strong');

        if ($questionNodes->count() === 0) {
            return []; // Nothing found
        }

        $questionNodes->each(function (Crawler $node, $i) use (&$questions) {
            $questionText = trim($node->text());
            
            // Skip empty or very short strings
            if (strlen($questionText) < 10) return;

            // Try to find answers. If node is a <li> or similar, answers might be sibling nodes or inside it
            $answers = [];
            $confidence = 0.5;

            // E.g., looking for input[type="radio"] or ul > li
            $answerNodes = $node->filter('input[type="radio"], input[type="checkbox"]');
            
            if ($answerNodes->count() > 0) {
                $confidence = 0.9;
                $answerNodes->each(function (Crawler $ansNode) use (&$answers) {
                    // Try to get label
                    $id = $ansNode->attr('id');
                    $label = '';
                    if ($id) {
                        $labelNode = $ansNode->closest('body')->filter("label[for='{$id}']");
                        if ($labelNode->count() > 0) {
                            $label = trim($labelNode->text());
                        }
                    }
                    if (!$label) {
                        $label = trim($ansNode->ancestors()->filter('label')->text());
                    }
                    if (!$label) {
                        $label = "Answer option"; // Fallback
                    }

                    $answers[] = new ScrapedAnswerData(
                        text: $label,
                        isCorrect: false // Can't easily determine correct answer from HTML usually
                    );
                });
            } else {
                // If it's just text, maybe the answers are in the next sibling ul
                $nextUl = $node->nextAll()->filter('ul')->first();
                if ($nextUl->count() > 0) {
                    $confidence = 0.8;
                    $nextUl->filter('li')->each(function (Crawler $ansNode) use (&$answers) {
                        $answers[] = new ScrapedAnswerData(
                            text: trim($ansNode->text()),
                            isCorrect: false
                        );
                    });
                }
            }

            if (empty($answers)) {
                $confidence = 0.2;
                $answers[] = new ScrapedAnswerData(text: 'Option A', isCorrect: false);
                $answers[] = new ScrapedAnswerData(text: 'Option B', isCorrect: false);
            }

            $questions[] = new ScrapedQuestionData(
                text: $questionText,
                answers: $answers,
                confidenceScore: $confidence
            );
        });

        // Deduplicate or clean if needed
        return $questions;
    }
}
