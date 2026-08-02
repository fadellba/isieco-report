<?php

declare(strict_types=1);

namespace App\Exceptions\Business;

final class SignalementNotValidatedException extends BusinessException
{
    public function __construct()
    {
        parent::__construct("Seul un signalement validé ou priorisé peut être affecté à une équipe.");
    }
}
