<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;

final class InterventionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin() || $user->isAgent();
    }

    public function view(User $user): bool
    {
        return $user->isAdmin() || $user->isAgent();
    }

    public function create(User $user): bool
    {
        return $user->isAdmin() || $user->isAgent();
    }

    public function update(User $user): bool
    {
        return $user->isAdmin() || $user->isAgent();
    }

    public function delete(User $user): bool
    {
        return $user->isAdmin();
    }
}
