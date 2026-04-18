import {
  ConversationParticipantRole,
  ConversationType,
  Gender,
  MessageType,
  PostVisibility,
  ReactableType,
  ReactionType,
  Role,
  ScheduledPostStatus,
  SearchType,
  UserInteractionType,
  UserStatus,
  WhoCanMessage,
  WhoCanSeeStory,
  WhoCanTag,
  WhoCanAddFriend,
  PrismaClient,
  FriendshipStatus,
} from '@prisma/client';
import { hash } from 'argon2';

const prisma = new PrismaClient();

async function findFirstOrCreate(delegate, where, data) {
  const existing = await delegate.findFirst({ where });
  if (existing) return existing;
  return delegate.create({ data });
}

function orderedPair(a, b) {
  return a < b ? [a, b] : [b, a];
}

async function seed() {
  const defaultPasswordHash = await hash('Password123!');

  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {
      username: 'alice',
      name: 'Alice Johnson',
      password: defaultPasswordHash,
      role: Role.ADMIN,
      location: 'Cairo',
      country: 'Egypt',
      city: 'Cairo',
      lat: 30.0444,
      lng: 31.2357,
      status: UserStatus.ACTIVE,
      isVerified: true,
      gender: Gender.FEMALE,
      emailVerifiedAt: new Date(),
      lastActiveAt: new Date(),
    },
    create: {
      username: 'alice',
      name: 'Alice Johnson',
      email: 'alice@example.com',
      password: defaultPasswordHash,
      role: Role.ADMIN,
      location: 'Cairo',
      country: 'Egypt',
      city: 'Cairo',
      lat: 30.0444,
      lng: 31.2357,
      status: UserStatus.ACTIVE,
      isVerified: true,
      gender: Gender.FEMALE,
      emailVerifiedAt: new Date(),
      phone: '+201000000001',
      dateOfBirth: new Date('1992-06-12'),
      bio: 'Product and community lead',
      lastActiveAt: new Date(),
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {
      username: 'bob',
      name: 'Bob Smith',
      password: defaultPasswordHash,
      role: Role.USER,
      location: 'Alexandria',
      country: 'Egypt',
      city: 'Alexandria',
      lat: 31.2001,
      lng: 29.9187,
      status: UserStatus.ACTIVE,
      gender: Gender.MALE,
      lastActiveAt: new Date(),
    },
    create: {
      username: 'bob',
      name: 'Bob Smith',
      email: 'bob@example.com',
      password: defaultPasswordHash,
      role: Role.USER,
      location: 'Alexandria',
      country: 'Egypt',
      city: 'Alexandria',
      lat: 31.2001,
      lng: 29.9187,
      status: UserStatus.ACTIVE,
      gender: Gender.MALE,
      phone: '+201000000002',
      dateOfBirth: new Date('1994-02-19'),
      bio: 'Frontend engineer and photographer',
      lastActiveAt: new Date(),
    },
  });

  const charlie = await prisma.user.upsert({
    where: { email: 'charlie@example.com' },
    update: {
      username: 'charlie',
      name: 'Charlie White',
      password: defaultPasswordHash,
      role: Role.MODERATOR,
      location: 'Giza',
      country: 'Egypt',
      city: 'Giza',
      lat: 30.0131,
      lng: 31.2089,
      status: UserStatus.ACTIVE,
      gender: Gender.OTHER,
      lastActiveAt: new Date(),
    },
    create: {
      username: 'charlie',
      name: 'Charlie White',
      email: 'charlie@example.com',
      password: defaultPasswordHash,
      role: Role.MODERATOR,
      location: 'Giza',
      country: 'Egypt',
      city: 'Giza',
      lat: 30.0131,
      lng: 31.2089,
      status: UserStatus.ACTIVE,
      gender: Gender.OTHER,
      phone: '+201000000003',
      dateOfBirth: new Date('1997-11-02'),
      bio: 'Moderator and community support',
      lastActiveAt: new Date(),
    },
  });

  const aliceAvatar = await findFirstOrCreate(
    prisma.media,
    { path: '/uploads/users/alice-avatar.jpg' },
    {
      fileName: 'alice-avatar.jpg',
      originalName: 'alice-avatar.jpg',
      mimeType: 'image/jpeg',
      size: 128_000n,
      hash: 'a6b1305f5dce3b1268fdb977f3a509bf6df035f2f3a8973f0ee88de54f0bfa90',
      path: '/uploads/users/alice-avatar.jpg',
      uploadedBy: alice.id,
    },
  );

  const aliceCover = await findFirstOrCreate(
    prisma.media,
    { path: '/uploads/users/alice-cover.jpg' },
    {
      fileName: 'alice-cover.jpg',
      originalName: 'alice-cover.jpg',
      mimeType: 'image/jpeg',
      size: 512_000n,
      hash: '7aa95f272f6f4f09c89e9e2675fddf4f7d8af9fd84c410d389ad0e2f5ccafb10',
      path: '/uploads/users/alice-cover.jpg',
      uploadedBy: alice.id,
    },
  );

  const postImage = await findFirstOrCreate(
    prisma.media,
    { path: '/uploads/posts/welcome-post.jpg' },
    {
      fileName: 'welcome-post.jpg',
      originalName: 'welcome-post.jpg',
      mimeType: 'image/jpeg',
      size: 420_000n,
      hash: 'ef0948d4f0bbac460b7ac6efc71f6d76d79de83649fd7b11dd18d3f861f5cb7f',
      path: '/uploads/posts/welcome-post.jpg',
      uploadedBy: bob.id,
    },
  );

  const groupAvatar = await findFirstOrCreate(
    prisma.media,
    { path: '/uploads/groups/core-team.png' },
    {
      fileName: 'core-team.png',
      originalName: 'core-team.png',
      mimeType: 'image/png',
      size: 210_000n,
      hash: 'f40331de4b8f80cdd66b6f95ecacbd49fd663f2f29f8dbce73d2f4adf4a0ef11',
      path: '/uploads/groups/core-team.png',
      uploadedBy: charlie.id,
    },
  );

  await prisma.user.update({
    where: { id: alice.id },
    data: {
      avatarMediaId: aliceAvatar.id,
      coverMediaId: aliceCover.id,
    },
  });

  await prisma.userPrivacy.upsert({
    where: { userId: alice.id },
    update: {
      whoCanMessage: WhoCanMessage.EVERYONE,
      whoCanSeePosts: PostVisibility.PUBLIC,
      whoCanSeeStory: WhoCanSeeStory.FRIENDS,
      whoCanAddFriend: WhoCanAddFriend.EVERYONE,
      whoCanTag: WhoCanTag.FRIENDS,
    },
    create: {
      userId: alice.id,
      whoCanMessage: WhoCanMessage.EVERYONE,
      whoCanSeePosts: PostVisibility.PUBLIC,
      whoCanSeeStory: WhoCanSeeStory.FRIENDS,
      whoCanAddFriend: WhoCanAddFriend.EVERYONE,
      whoCanTag: WhoCanTag.FRIENDS,
    },
  });

  await prisma.userPrivacy.upsert({
    where: { userId: bob.id },
    update: {
      whoCanMessage: WhoCanMessage.FRIENDS,
      whoCanSeePosts: PostVisibility.FRIENDS,
      whoCanSeeStory: WhoCanSeeStory.FRIENDS,
      whoCanAddFriend: WhoCanAddFriend.FRIENDS_OF_FRIENDS,
      whoCanTag: WhoCanTag.FRIENDS,
    },
    create: {
      userId: bob.id,
      whoCanMessage: WhoCanMessage.FRIENDS,
      whoCanSeePosts: PostVisibility.FRIENDS,
      whoCanSeeStory: WhoCanSeeStory.FRIENDS,
      whoCanAddFriend: WhoCanAddFriend.FRIENDS_OF_FRIENDS,
      whoCanTag: WhoCanTag.FRIENDS,
    },
  });

  await prisma.userPrivacy.upsert({
    where: { userId: charlie.id },
    update: {
      whoCanMessage: WhoCanMessage.FRIENDS_OF_FRIENDS,
      whoCanSeePosts: PostVisibility.PUBLIC,
      whoCanSeeStory: WhoCanSeeStory.CLOSE_FRIENDS,
      whoCanAddFriend: WhoCanAddFriend.EVERYONE,
      whoCanTag: WhoCanTag.EVERYONE,
    },
    create: {
      userId: charlie.id,
      whoCanMessage: WhoCanMessage.FRIENDS_OF_FRIENDS,
      whoCanSeePosts: PostVisibility.PUBLIC,
      whoCanSeeStory: WhoCanSeeStory.CLOSE_FRIENDS,
      whoCanAddFriend: WhoCanAddFriend.EVERYONE,
      whoCanTag: WhoCanTag.EVERYONE,
    },
  });

  const postAlice = await findFirstOrCreate(
    prisma.post,
    { userId: alice.id, content: 'Welcome to LLL Social. Building in public starts here.' },
    {
      userId: alice.id,
      content: 'Welcome to LLL Social. Building in public starts here.',
      visibility: PostVisibility.PUBLIC,
      feeling: 'excited',
      location: 'Cairo',
    },
  );

  const postBob = await findFirstOrCreate(
    prisma.post,
    { userId: bob.id, content: 'Drafting private notes for a new product idea.' },
    {
      userId: bob.id,
      content: 'Drafting private notes for a new product idea.',
      visibility: PostVisibility.CUSTOM,
      feeling: 'focused',
      location: 'Alexandria',
    },
  );

  await prisma.postMedia.upsert({
    where: {
      postId_mediaId: {
        postId: postAlice.id,
        mediaId: postImage.id,
      },
    },
    update: {},
    create: {
      postId: postAlice.id,
      mediaId: postImage.id,
    },
  });

  await prisma.postAllowedUser.upsert({
    where: {
      postId_userId: {
        postId: postBob.id,
        userId: alice.id,
      },
    },
    update: {},
    create: {
      postId: postBob.id,
      userId: alice.id,
    },
  });

  const existingPostEdit = await prisma.postEdit.findFirst({
    where: {
      postId: postBob.id,
      oldContent: 'Drafting private notes for a new product idea.',
    },
  });

  if (!existingPostEdit) {
    await prisma.postEdit.create({
      data: {
        postId: postBob.id,
        oldContent: 'Drafting private notes for a new product idea.',
      },
    });

    await prisma.post.update({
      where: { id: postBob.id },
      data: {
        content: 'Drafting private notes for a new product idea and sharing it with close friends.',
        isEdited: true,
      },
    });
  }

  const scheduledFor = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const scheduledPost = await findFirstOrCreate(
    prisma.scheduledPost,
    {
      userId: charlie.id,
      content: 'Tomorrow update: moderation transparency report.',
    },
    {
      userId: charlie.id,
      content: 'Tomorrow update: moderation transparency report.',
      visibility: PostVisibility.PUBLIC,
      status: ScheduledPostStatus.PENDING,
      scheduledFor,
      location: 'Giza',
      feeling: 'grateful',
    },
  );

  await prisma.scheduledPostMedia.upsert({
    where: {
      scheduledPostId_mediaId: {
        scheduledPostId: scheduledPost.id,
        mediaId: postImage.id,
      },
    },
    update: {},
    create: {
      scheduledPostId: scheduledPost.id,
      mediaId: postImage.id,
    },
  });

  const commentBob = await findFirstOrCreate(
    prisma.comment,
    {
      postId: postAlice.id,
      userId: bob.id,
      content: 'Great start. Looking forward to seeing the roadmap.',
    },
    {
      postId: postAlice.id,
      userId: bob.id,
      content: 'Great start. Looking forward to seeing the roadmap.',
    },
  );

  const commentAliceReply = await findFirstOrCreate(
    prisma.comment,
    {
      postId: postAlice.id,
      userId: alice.id,
      parentId: commentBob.id,
      content: 'Thanks Bob. We will publish milestones weekly.',
    },
    {
      postId: postAlice.id,
      userId: alice.id,
      parentId: commentBob.id,
      content: 'Thanks Bob. We will publish milestones weekly.',
    },
  );

  const existingCommentEdit = await prisma.commentEdit.findFirst({
    where: {
      commentId: commentBob.id,
      oldContent: 'Great start. Looking forward to seeing the roadmap.',
    },
  });

  if (!existingCommentEdit) {
    await prisma.commentEdit.create({
      data: {
        commentId: commentBob.id,
        oldContent: 'Great start. Looking forward to seeing the roadmap.',
      },
    });

    await prisma.comment.update({
      where: { id: commentBob.id },
      data: {
        content: 'Great start. Looking forward to seeing the roadmap and launch plan.',
        isEdited: true,
      },
    });
  }

  await prisma.reaction.upsert({
    where: {
      userId_reactableId_reactableType: {
        userId: charlie.id,
        reactableId: postAlice.id,
        reactableType: ReactableType.POST,
      },
    },
    update: { reactionType: ReactionType.LIKE },
    create: {
      userId: charlie.id,
      reactableId: postAlice.id,
      reactableType: ReactableType.POST,
      reactionType: ReactionType.LIKE,
    },
  });

  await prisma.reaction.upsert({
    where: {
      userId_reactableId_reactableType: {
        userId: alice.id,
        reactableId: commentBob.id,
        reactableType: ReactableType.COMMENT,
      },
    },
    update: { reactionType: ReactionType.LOVE },
    create: {
      userId: alice.id,
      reactableId: commentBob.id,
      reactableType: ReactableType.COMMENT,
      reactionType: ReactionType.LOVE,
    },
  });

  const [ab1, ab2] = orderedPair(alice.id, bob.id);
  await prisma.friendship.upsert({
    where: {
      userId1_userId2: {
        userId1: ab1,
        userId2: ab2,
      },
    },
    update: {
      status: FriendshipStatus.ACCEPTED,
    },
    create: {
      userId1: ab1,
      userId2: ab2,
      status: FriendshipStatus.ACCEPTED,
    },
  });

  const [ac1, ac2] = orderedPair(alice.id, charlie.id);
  await prisma.friendship.upsert({
    where: {
      userId1_userId2: {
        userId1: ac1,
        userId2: ac2,
      },
    },
    update: {
      status: FriendshipStatus.PENDING,
    },
    create: {
      userId1: ac1,
      userId2: ac2,
      status: FriendshipStatus.PENDING,
    },
  });

  await prisma.block.upsert({
    where: {
      blockerId_blockedId: {
        blockerId: bob.id,
        blockedId: charlie.id,
      },
    },
    update: {
      reason: 'Temporary mute from repeated spam links',
    },
    create: {
      blockerId: bob.id,
      blockedId: charlie.id,
      reason: 'Temporary mute from repeated spam links',
    },
  });

  const directConversation = await findFirstOrCreate(
    prisma.conversation,
    { name: 'Direct: alice-bob' },
    {
      type: ConversationType.DIRECT,
      name: 'Direct: alice-bob',
      createdBy: alice.id,
    },
  );

  const groupConversation = await findFirstOrCreate(
    prisma.conversation,
    { name: 'Core Team' },
    {
      type: ConversationType.GROUP,
      name: 'Core Team',
      description: 'Planning and release coordination',
      avatarMediaId: groupAvatar.id,
      createdBy: charlie.id,
    },
  );

  await prisma.conversationParticipant.upsert({
    where: {
      conversationId_userId: {
        conversationId: directConversation.id,
        userId: alice.id,
      },
    },
    update: { role: ConversationParticipantRole.ADMIN },
    create: {
      conversationId: directConversation.id,
      userId: alice.id,
      role: ConversationParticipantRole.ADMIN,
    },
  });

  await prisma.conversationParticipant.upsert({
    where: {
      conversationId_userId: {
        conversationId: directConversation.id,
        userId: bob.id,
      },
    },
    update: { role: ConversationParticipantRole.MEMBER },
    create: {
      conversationId: directConversation.id,
      userId: bob.id,
      role: ConversationParticipantRole.MEMBER,
    },
  });

  await prisma.conversationParticipant.upsert({
    where: {
      conversationId_userId: {
        conversationId: groupConversation.id,
        userId: alice.id,
      },
    },
    update: { role: ConversationParticipantRole.ADMIN },
    create: {
      conversationId: groupConversation.id,
      userId: alice.id,
      role: ConversationParticipantRole.ADMIN,
    },
  });

  await prisma.conversationParticipant.upsert({
    where: {
      conversationId_userId: {
        conversationId: groupConversation.id,
        userId: bob.id,
      },
    },
    update: { role: ConversationParticipantRole.MEMBER },
    create: {
      conversationId: groupConversation.id,
      userId: bob.id,
      role: ConversationParticipantRole.MEMBER,
    },
  });

  await prisma.conversationParticipant.upsert({
    where: {
      conversationId_userId: {
        conversationId: groupConversation.id,
        userId: charlie.id,
      },
    },
    update: { role: ConversationParticipantRole.ADMIN },
    create: {
      conversationId: groupConversation.id,
      userId: charlie.id,
      role: ConversationParticipantRole.ADMIN,
    },
  });

  const directMessage1 = await prisma.message.upsert({
    where: {
      senderId_clientMessageId: {
        senderId: alice.id,
        clientMessageId: 'seed-direct-1',
      },
    },
    update: {
      content: 'Hi Bob, welcome to the platform.',
      conversationId: directConversation.id,
      messageType: MessageType.TEXT,
    },
    create: {
      conversationId: directConversation.id,
      senderId: alice.id,
      content: 'Hi Bob, welcome to the platform.',
      messageType: MessageType.TEXT,
      clientMessageId: 'seed-direct-1',
    },
  });

  const directMessage2 = await prisma.message.upsert({
    where: {
      senderId_clientMessageId: {
        senderId: bob.id,
        clientMessageId: 'seed-direct-2',
      },
    },
    update: {
      content: 'Thanks Alice. Testing replies now.',
      conversationId: directConversation.id,
      messageType: MessageType.TEXT,
      replyToId: directMessage1.id,
    },
    create: {
      conversationId: directConversation.id,
      senderId: bob.id,
      content: 'Thanks Alice. Testing replies now.',
      messageType: MessageType.TEXT,
      replyToId: directMessage1.id,
      clientMessageId: 'seed-direct-2',
    },
  });

  const groupMessage = await prisma.message.upsert({
    where: {
      senderId_clientMessageId: {
        senderId: charlie.id,
        clientMessageId: 'seed-group-1',
      },
    },
    update: {
      content: 'Please review moderation dashboard updates before release.',
      conversationId: groupConversation.id,
      messageType: MessageType.TEXT,
    },
    create: {
      conversationId: groupConversation.id,
      senderId: charlie.id,
      content: 'Please review moderation dashboard updates before release.',
      messageType: MessageType.TEXT,
      clientMessageId: 'seed-group-1',
    },
  });

  await prisma.messageAttachment.upsert({
    where: {
      messageId_mediaId: {
        messageId: directMessage1.id,
        mediaId: postImage.id,
      },
    },
    update: {},
    create: {
      messageId: directMessage1.id,
      mediaId: postImage.id,
    },
  });

  const existingMessageEdit = await prisma.messageEdit.findFirst({
    where: {
      messageId: directMessage2.id,
      oldContent: 'Thanks Alice. Testing replies now.',
    },
  });

  if (!existingMessageEdit) {
    await prisma.messageEdit.create({
      data: {
        messageId: directMessage2.id,
        oldContent: 'Thanks Alice. Testing replies now.',
      },
    });

    await prisma.message.update({
      where: { id: directMessage2.id },
      data: {
        content: 'Thanks Alice. Testing threaded replies now.',
        isEdited: true,
        editedAt: new Date(),
      },
    });
  }

  await prisma.conversation.update({
    where: { id: directConversation.id },
    data: {
      lastMessageId: directMessage2.id,
      lastMessageAt: directMessage2.createdAt,
    },
  });

  await prisma.conversation.update({
    where: { id: groupConversation.id },
    data: {
      lastMessageId: groupMessage.id,
      lastMessageAt: groupMessage.createdAt,
    },
  });

  await prisma.conversationParticipant.update({
    where: {
      conversationId_userId: {
        conversationId: directConversation.id,
        userId: alice.id,
      },
    },
    data: { lastReadMessageId: directMessage2.id },
  });

  await prisma.conversationParticipant.update({
    where: {
      conversationId_userId: {
        conversationId: directConversation.id,
        userId: bob.id,
      },
    },
    data: { lastReadMessageId: directMessage2.id },
  });

  await prisma.notification.upsert({
    where: { uniqueKey: 'friendship_accepted_alice_bob' },
    update: {
      userId: bob.id,
      actorId: alice.id,
      type: 'friendship.accepted',
      data: { friendshipBetween: ['alice', 'bob'] },
      entityId: postAlice.id,
      entityType: 'Post',
      isRead: false,
    },
    create: {
      userId: bob.id,
      actorId: alice.id,
      type: 'friendship.accepted',
      data: { friendshipBetween: ['alice', 'bob'] },
      entityId: postAlice.id,
      entityType: 'Post',
      uniqueKey: 'friendship_accepted_alice_bob',
      isRead: false,
    },
  });

  await prisma.notification.upsert({
    where: { uniqueKey: 'mention_charlie_in_post_alice' },
    update: {
      userId: charlie.id,
      actorId: alice.id,
      type: 'mention.created',
      data: { context: 'post' },
      entityId: postAlice.id,
      entityType: 'Post',
      isRead: false,
    },
    create: {
      userId: charlie.id,
      actorId: alice.id,
      type: 'mention.created',
      data: { context: 'post' },
      entityId: postAlice.id,
      entityType: 'Post',
      uniqueKey: 'mention_charlie_in_post_alice',
      isRead: false,
    },
  });

  await prisma.savedPost.upsert({
    where: {
      userId_postId: {
        userId: bob.id,
        postId: postAlice.id,
      },
    },
    update: {},
    create: {
      userId: bob.id,
      postId: postAlice.id,
    },
  });

  const existingSearch = await prisma.searchHistory.findFirst({
    where: {
      userId: alice.id,
      query: 'design systems',
      searchType: SearchType.POSTS,
    },
  });

  if (!existingSearch) {
    await prisma.searchHistory.create({
      data: {
        userId: alice.id,
        query: 'design systems',
        searchType: SearchType.POSTS,
      },
    });
  }

  const mention = await prisma.mention.findFirst({
    where: {
      userId: charlie.id,
      mentionedInType: 'Post',
      mentionedInId: postAlice.id,
    },
  });

  if (!mention) {
    await prisma.mention.create({
      data: {
        userId: charlie.id,
        mentionedInType: 'Post',
        mentionedInId: postAlice.id,
      },
    });
  }

  const hashtagBuild = await prisma.hashtag.upsert({
    where: { nameLower: 'buildinpublic' },
    update: { name: 'BuildInPublic' },
    create: {
      name: 'BuildInPublic',
      nameLower: 'buildinpublic',
    },
  });

  const hashtagLaunch = await prisma.hashtag.upsert({
    where: { nameLower: 'launch' },
    update: { name: 'Launch' },
    create: {
      name: 'Launch',
      nameLower: 'launch',
    },
  });

  await prisma.postHashtag.upsert({
    where: {
      postId_hashtagId: {
        postId: postAlice.id,
        hashtagId: hashtagBuild.id,
      },
    },
    update: {},
    create: {
      postId: postAlice.id,
      hashtagId: hashtagBuild.id,
    },
  });

  await prisma.postHashtag.upsert({
    where: {
      postId_hashtagId: {
        postId: postAlice.id,
        hashtagId: hashtagLaunch.id,
      },
    },
    update: {},
    create: {
      postId: postAlice.id,
      hashtagId: hashtagLaunch.id,
    },
  });

  const adminRole = await findFirstOrCreate(
    prisma.appRole,
    { name: 'admin' },
    { name: 'admin', guardName: 'api' },
  );

  const userRole = await findFirstOrCreate(
    prisma.appRole,
    { name: 'user' },
    { name: 'user', guardName: 'api' },
  );

  const manageUsersPermission = await findFirstOrCreate(
    prisma.permission,
    { name: 'manage-users' },
    { name: 'manage-users', guardName: 'api' },
  );

  const createPostPermission = await findFirstOrCreate(
    prisma.permission,
    { name: 'create-post' },
    { name: 'create-post', guardName: 'api' },
  );

  await prisma.modelHasRole.upsert({
    where: {
      modelType_modelId_roleId: {
        modelType: 'User',
        modelId: alice.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      modelType: 'User',
      modelId: alice.id,
      roleId: adminRole.id,
    },
  });

  await prisma.modelHasRole.upsert({
    where: {
      modelType_modelId_roleId: {
        modelType: 'User',
        modelId: bob.id,
        roleId: userRole.id,
      },
    },
    update: {},
    create: {
      modelType: 'User',
      modelId: bob.id,
      roleId: userRole.id,
    },
  });

  const interactionSeeds = [
    {
      userId: alice.id,
      postId: postAlice.id,
      interactionType: UserInteractionType.VIEW,
      watchTime: 14,
    },
    {
      userId: bob.id,
      postId: postAlice.id,
      interactionType: UserInteractionType.LIKE,
      watchTime: null,
    },
    {
      userId: charlie.id,
      postId: postAlice.id,
      interactionType: UserInteractionType.COMMENT,
      watchTime: null,
    },
  ];

  for (const interaction of interactionSeeds) {
    const existingInteraction = await prisma.userInteraction.findFirst({
      where: {
        userId: interaction.userId,
        postId: interaction.postId,
        interactionType: interaction.interactionType,
      },
    });

    if (!existingInteraction) {
      await prisma.userInteraction.create({
        data: interaction,
      });
    }
  }

  const trend = await prisma.trendingScore.findFirst({
    where: {
      postId: postAlice.id,
      region: 'EG',
    },
  });

  if (!trend) {
    await prisma.trendingScore.create({
      data: {
        postId: postAlice.id,
        score: 87.5,
        region: 'EG',
        calculatedAt: new Date(),
      },
    });
  }

  await prisma.userRelationshipScore.upsert({
    where: {
      userId_targetUserId: {
        userId: alice.id,
        targetUserId: bob.id,
      },
    },
    update: {
      score: 0.91,
    },
    create: {
      userId: alice.id,
      targetUserId: bob.id,
      score: 0.91,
    },
  });

  await prisma.userInterest.upsert({
    where: {
      userId_interest: {
        userId: alice.id,
        interest: 'technology',
      },
    },
    update: { score: 0.95 },
    create: {
      userId: alice.id,
      interest: 'technology',
      score: 0.95,
    },
  });

  await prisma.userInterest.upsert({
    where: {
      userId_interest: {
        userId: bob.id,
        interest: 'design',
      },
    },
    update: { score: 0.8 },
    create: {
      userId: bob.id,
      interest: 'design',
      score: 0.8,
    },
  });

  const categoryProduct = await findFirstOrCreate(
    prisma.postCategory,
    { name: 'Product' },
    { name: 'Product' },
  );

  const categoryEngineering = await findFirstOrCreate(
    prisma.postCategory,
    { name: 'Engineering' },
    { name: 'Engineering' },
  );

  await prisma.postCategoryMap.upsert({
    where: {
      postId_categoryId: {
        postId: postAlice.id,
        categoryId: categoryProduct.id,
      },
    },
    update: {},
    create: {
      postId: postAlice.id,
      categoryId: categoryProduct.id,
    },
  });

  await prisma.postCategoryMap.upsert({
    where: {
      postId_categoryId: {
        postId: postAlice.id,
        categoryId: categoryEngineering.id,
      },
    },
    update: {},
    create: {
      postId: postAlice.id,
      categoryId: categoryEngineering.id,
    },
  });

  await prisma.userFeedCache.upsert({
    where: {
      userId_postId: {
        userId: bob.id,
        postId: postAlice.id,
      },
    },
    update: { score: 0.99 },
    create: {
      userId: bob.id,
      postId: postAlice.id,
      score: 0.99,
    },
  });

  await prisma.modelHasPermission.upsert({
    where: {
      modelType_modelId_permissionId: {
        modelType: 'User',
        modelId: alice.id,
        permissionId: manageUsersPermission.id,
      },
    },
    update: {},
    create: {
      modelType: 'User',
      modelId: alice.id,
      permissionId: manageUsersPermission.id,
    },
  });

  await prisma.modelHasPermission.upsert({
    where: {
      modelType_modelId_permissionId: {
        modelType: 'User',
        modelId: bob.id,
        permissionId: createPostPermission.id,
      },
    },
    update: {},
    create: {
      modelType: 'User',
      modelId: bob.id,
      permissionId: createPostPermission.id,
    },
  });

  console.log('Seeding completed successfully.');
}

seed()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Seeding failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
